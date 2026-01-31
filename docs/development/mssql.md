# MSSQL Adapter Implementation

Technical documentation for the Microsoft SQL Server adapter in Database Backup Manager.

## Overview

| Feature | Implementation |
|---------|----------------|
| **Supported Versions** | SQL Server 2017, 2019, 2022, Azure SQL Edge |
| **Backup Method** | Native T-SQL `BACKUP DATABASE` |
| **Restore Method** | Native T-SQL `RESTORE DATABASE` |
| **Multi-DB Support** | Yes (via TAR archive) |
| **Compression** | Native (Enterprise/Standard only) |
| **Node.js Package** | `mssql` v12.x (no CLI tools required) |

## Architecture

### Why T-SQL Instead of CLI Tools?

Unlike MySQL (`mysqldump`) or PostgreSQL (`pg_dump`), Microsoft does not provide a cross-platform dump utility. The available tools are:

| Tool | Purpose | Limitation |
|------|---------|------------|
| `sqlcmd` | Execute SQL commands | No dump capability |
| `bcp` | Bulk data export | No schema, no transactions |
| SMO Scripts | Full backup | Requires .NET/PowerShell |

**Our Solution**: Use the `mssql` npm package to execute native T-SQL `BACKUP DATABASE` commands directly. This provides:
- Full transactional consistency
- Schema + data in single file
- Compression support (where available)
- No external CLI dependencies

### File Structure

```
src/lib/adapters/database/mssql/
├── index.ts          # DatabaseAdapter export
├── connection.ts     # test(), getDatabases(), supportsCompression()
├── dump.ts           # BACKUP DATABASE implementation
├── restore.ts        # RESTORE DATABASE implementation
├── analyze.ts        # Stub (returns empty array)
└── dialects/
    ├── index.ts      # Dialect factory (getDialect)
    ├── mssql-base.ts # SQL Server 2019+ dialect
    └── mssql-2017.ts # SQL Server 2017 dialect
```

## Configuration Schema

```typescript
// src/lib/adapters/definitions.ts
export const MSSQLSchema = z.object({
    host: z.string().default("localhost"),
    port: z.coerce.number().default(1433),
    user: z.string().min(1, "User is required"),
    password: z.string().optional(),
    database: z.union([z.string(), z.array(z.string())]).default(""),
    encrypt: z.boolean().default(true)
        .describe("Encrypt connection (required for Azure SQL)"),
    trustServerCertificate: z.boolean().default(false)
        .describe("Trust self-signed certificates (for development)"),
    backupPath: z.string().default("/var/opt/mssql/backup")
        .describe("Server-side path for .bak files (inside container)"),
    localBackupPath: z.string().default("/tmp")
        .describe("Host-side path where Docker volume is mounted"),
    options: z.string().optional()
        .describe("Additional backup options"),
});
```

### Key Configuration Fields

| Field | Purpose | Default |
|-------|---------|---------|
| `backupPath` | Where MSSQL writes `.bak` files (server-side) | `/var/opt/mssql/backup` |
| `localBackupPath` | Host path to access backups (Docker volume) | `/tmp` |
| `encrypt` | TLS encryption for connection | `true` |
| `trustServerCertificate` | Accept self-signed certs | `false` |

## Backup Implementation

### The Server-Side Backup Problem

MSSQL's `BACKUP DATABASE` writes files **on the server filesystem**, not to the client:

```
┌─────────────────────┐     ┌─────────────────────────────────┐
│   Your Application  │     │      MSSQL Container            │
│                     │     │                                 │
│  1. Execute SQL ────┼────►│  BACKUP DATABASE [db]           │
│                     │     │  TO DISK = '/var/.../backup'    │
│                     │     │           │                     │
│                     │     │           ▼                     │
│                     │     │  /var/opt/mssql/backup/db.bak   │
│                     │     │           │                     │
│                     │     └───────────┼─────────────────────┘
│                     │                 │ Docker Volume Mount
│  2. Copy file ◄─────┼─────────────────┘
│     from /tmp       │     /tmp/db.bak (host)
└─────────────────────┘
```

### Solution: Docker Volume Mount

```yaml
# docker-compose.yml
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    volumes:
      - /tmp:/var/opt/mssql/backup  # Key: Mount host path to backup path
```

### Backup Flow (dump.ts)

```typescript
async function dump(config, destinationPath, onLog) {
    // 1. Check compression support (Express/Web editions don't support it)
    const useCompression = await supportsCompression(config);

    // 2. Generate backup path on server
    const serverBakPath = path.posix.join(serverBackupPath, `${db}_${timestamp}.bak`);
    const localBakPath = path.join(localBackupPath, `${db}_${timestamp}.bak`);

    // 3. Execute T-SQL BACKUP
    const query = `BACKUP DATABASE [${db}] TO DISK = N'${serverBakPath}'
                   WITH FORMAT, INIT, STATS = 10${useCompression ? ', COMPRESSION' : ''}`;
    await executeQuery(config, query);

    // 4. Copy from local mount to destination
    await copyFile(localBakPath, destinationPath);

    // 5. Cleanup
    await fs.unlink(localBakPath);
}
```

### Multi-Database Backups (TAR Archive)

MSSQL cannot create a single backup file for multiple databases. Our solution:

1. Create individual `.bak` files for each database
2. Pack all files into a TAR archive
3. Upload the TAR as the final backup

```typescript
// Multi-DB: Pack into TAR archive
const tarPack = pack();
for (const file of bakFiles) {
    const entry = tarPack.entry({ name: path.basename(file), size: stats.size });
    createReadStream(file).pipe(entry);
}
tarPack.finalize();
```

## Restore Implementation

### Restore Flow (restore.ts)

```typescript
async function restore(config, sourcePath, onLog) {
    // 1. Detect if source is TAR archive (multi-DB backup)
    const isTar = await checkIfTarArchive(sourcePath);

    if (isTar) {
        // 2a. Extract all .bak files from TAR
        const extractedFiles = await extractTarArchive(sourcePath, localBackupPath);

        // 2b. Restore each .bak file
        for (const bakFile of extractedFiles) {
            await restoreDatabase(config, bakFile);
        }
    } else {
        // 2. Single .bak file - copy to server location
        await copyFile(sourcePath, localBakPath);

        // 3. Get logical file names from backup
        const fileList = await executeQuery(config,
            `RESTORE FILELISTONLY FROM DISK = '${serverBakPath}'`);

        // 4. Execute RESTORE with MOVE clauses
        const query = `RESTORE DATABASE [${targetDb}] FROM DISK = '${serverBakPath}'
                       WITH REPLACE, RECOVERY, STATS = 10
                       ${moveFiles.map(f => `MOVE '${f.logical}' TO '${f.physical}'`).join(', ')}`;
        await executeQuery(config, query);
    }
}
```

### TAR Archive Detection

```typescript
async function checkIfTarArchive(filePath: string): Promise<boolean> {
    const buffer = Buffer.alloc(512);
    const fd = await fs.open(filePath, "r");
    await fd.read(buffer, 0, 512, 0);
    await fd.close();

    // TAR files have "ustar" at offset 257
    return buffer.slice(257, 262).toString() === "ustar";
}
```

## Edition Compatibility

### The Azure SQL Edge Problem

Azure SQL Edge and SQL Server 2019 both report version `15.x`, but they are **not compatible**:

| Product | Version | EngineEdition | Compatible With |
|---------|---------|---------------|-----------------|
| SQL Server 2019 Express | 15.0.x | 4 | SQL Server only |
| SQL Server 2019 Standard | 15.0.x | 2 | SQL Server only |
| Azure SQL Edge | 15.0.x | 9 | Azure SQL Edge only |

### Solution: Edition Detection

```typescript
// connection.ts
export async function test(config): Promise<{ success, message, version, edition }> {
    const result = await executeQuery(config, `
        SELECT
            SERVERPROPERTY('ProductVersion') AS Version,
            SERVERPROPERTY('Edition') AS Edition,
            SERVERPROPERTY('EngineEdition') AS EngineEdition
    `);

    // Detect Azure SQL Edge by EngineEdition = 9
    let edition = "Unknown";
    if (engineEdition === 9) edition = "Azure SQL Edge";
    else if (editionRaw.includes("Express")) edition = "Express";
    else if (editionRaw.includes("Standard")) edition = "Standard";
    // ...

    return { success: true, message, version, edition };
}
```

### Restore Pre-Flight Check

```typescript
// restore-service.ts
if (targetConfig.adapterId === 'mssql' && metadata.engineEdition && testResult.edition) {
    const sourceIsEdge = metadata.engineEdition === 'Azure SQL Edge';
    const targetIsEdge = testResult.edition === 'Azure SQL Edge';

    if (sourceIsEdge !== targetIsEdge) {
        throw new Error(
            `Incompatible MSSQL editions: Cannot restore backup from ` +
            `'${metadata.engineEdition}' to '${testResult.edition}'.`
        );
    }
}
```

## Compression Support

Native backup compression is **not available** in all editions:

| Edition | Compression |
|---------|-------------|
| Enterprise | ✅ Yes |
| Standard | ✅ Yes |
| Developer | ✅ Yes |
| Express | ❌ No |
| Web | ❌ No |
| Azure SQL Edge | ❌ No |

### Runtime Detection

```typescript
// connection.ts
export async function supportsCompression(config: any): Promise<boolean> {
    const result = await executeQuery(config, `
        SELECT SERVERPROPERTY('Edition') AS Edition,
               SERVERPROPERTY('EngineEdition') AS EngineEdition
    `);

    const edition = result.recordset[0]?.Edition || "";
    const engineEdition = result.recordset[0]?.EngineEdition || 0;

    // Express, Web, and Azure SQL Edge don't support compression
    if (edition.toLowerCase().includes("express")) return false;
    if (edition.toLowerCase().includes("web")) return false;
    if (engineEdition === 9) return false; // Azure SQL Edge

    return true;
}
```

## Docker Test Configuration

### docker-compose.test.yml

```yaml
services:
  mssql-2019:
    image: mcr.microsoft.com/mssql/server:2019-latest
    platform: linux/amd64
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "YourStrong!Passw0rd"
      MSSQL_PID: "Express"
    ports:
      - "14339:1433"
    volumes:
      - /tmp:/var/opt/mssql/backup

  mssql-2022:
    image: mcr.microsoft.com/mssql/server:2022-latest
    platform: linux/amd64
    ports:
      - "14342:1433"
    volumes:
      - /tmp:/var/opt/mssql/backup

  mssql-edge:
    image: mcr.microsoft.com/azure-sql-edge:latest  # ARM64 compatible!
    ports:
      - "14350:1433"
    volumes:
      - /tmp:/var/opt/mssql/backup
```

### Test Configuration

```typescript
// tests/integration/test-configs.ts
{
    name: 'Test MSSQL 2022',
    config: {
        type: 'mssql',
        host: 'localhost',
        port: 14342,
        user: 'sa',
        password: 'YourStrong!Passw0rd',
        database: 'testdb',
        encrypt: true,
        trustServerCertificate: true,
        backupPath: '/var/opt/mssql/backup',
        localBackupPath: '/tmp'
    }
}
```

## Known Limitations

### 1. Azure SQL Database (Cloud)
Azure SQL Database does **not** support `BACKUP DATABASE` commands. It requires:
- Azure Blob Storage as backup target
- `BACKUP DATABASE ... TO URL = '...'` syntax
- Azure-specific credentials

**Status**: Not supported in current implementation.

### 2. ARM64 Support
Only Azure SQL Edge runs natively on ARM64 (Apple Silicon). SQL Server images require:
- Rosetta 2 emulation, or
- QEMU/Docker Desktop amd64 emulation

### 3. Large Database Performance
T-SQL `BACKUP DATABASE` buffers data on the server. For very large databases (>100GB), consider:
- Increasing `backupPath` disk space
- Using compressed backups (Enterprise/Standard)
- Network bandwidth for file transfer

## Dependencies

```json
{
  "dependencies": {
    "mssql": "^12.2.0",
    "tar-stream": "^3.1.7"
  },
  "devDependencies": {
    "@types/mssql": "^9.1.9",
    "@types/tar-stream": "^3.1.4"
  }
}
```

## Changelog

| Date | Change |
|------|--------|
| 2026-01-31 | Initial implementation |
| 2026-01-31 | Added TAR archive support for multi-DB backups |
| 2026-01-31 | Added Azure SQL Edge edition detection & compatibility check |
| 2026-01-31 | Fixed compression detection for Express/Web editions |
