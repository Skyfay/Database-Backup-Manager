# Database Adapters

Database adapters handle the dump and restore operations for different database systems.

## Available Adapters

| Adapter | ID | CLI Tools Required | File Extension |
| :--- | :--- | :--- | :--- |
| MySQL | `mysql` | `mysql`, `mysqldump` | `.sql` |
| MariaDB | `mariadb` | `mysql`, `mysqldump` | `.sql` |
| PostgreSQL | `postgresql` | `psql`, `pg_dump`, `pg_restore` | `.sql` |
| MongoDB | `mongodb` | `mongodump`, `mongorestore` | `.archive` |
| SQLite | `sqlite` | None (file copy) | `.db` |
| MSSQL | `mssql` | `sqlcmd` | `.bak` |
| Redis | `redis` | `redis-cli` | `.rdb` |

## Backup File Extensions

Each adapter uses an appropriate file extension that reflects the actual backup format. This is handled by the `backup-extensions.ts` utility:

```typescript
import { getBackupFileExtension } from "@/lib/backup-extensions";

// Returns the extension without leading dot
getBackupFileExtension("mysql");    // "sql"
getBackupFileExtension("redis");    // "rdb"
getBackupFileExtension("mongodb");  // "archive"
getBackupFileExtension("sqlite");   // "db"
getBackupFileExtension("mssql");    // "bak"
```

### Extension Mapping

| Adapter | Extension | Reason |
|---------|-----------|--------|
| MySQL/MariaDB | `.sql` | Standard SQL dump format |
| PostgreSQL | `.sql` | SQL dump (or `.dump` for custom format) |
| MSSQL | `.bak` | Native SQL Server backup format |
| MongoDB | `.archive` | mongodump `--archive` format |
| Redis | `.rdb` | Redis Database snapshot format |
| SQLite | `.db` | Direct database file copy |

### Final Filename Examples

With compression and encryption enabled:
- MySQL: `backup_2026-02-02.sql.gz.enc`
- Redis: `backup_2026-02-02.rdb.gz.enc`
- MongoDB: `backup_2026-02-02.archive.gz.enc`

## Interface

```typescript
interface DatabaseAdapter {
  id: string;
  type: "database";
  name: string;
  icon?: string;
  configSchema: ZodSchema;

  // Core operations
  dump(config: unknown, destinationPath: string, streams?: Transform[]): Promise<BackupResult>;
  restore(config: unknown, sourcePath: string): Promise<BackupResult>;

  // Connection test
  test(config: unknown): Promise<TestResult>;

  // Optional: List databases
  getDatabases?(config: unknown): Promise<string[]>;

  // Optional: Version detection
  getVersion?(config: unknown): Promise<string>;
}
```

## MySQL Adapter

### Configuration Schema

```typescript
const MySQLSchema = z.object({
  host: z.string().default("localhost"),
  port: z.coerce.number().default(3306),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().optional(),
  databases: z.array(z.string()).optional(),
  sslMode: z.enum(["disabled", "required", "verify-ca"]).default("disabled"),
  sslCa: z.string().optional(),
});
```

### Dump Implementation

```typescript
async dump(config, destinationPath, streams = []) {
  const validated = MySQLSchema.parse(config);

  const args = [
    `-h${validated.host}`,
    `-P${validated.port}`,
    `-u${validated.username}`,
    `--password=${validated.password}`,
    "--single-transaction",
    "--routines",
    "--triggers",
  ];

  // Single database or all
  if (validated.database) {
    args.push(validated.database);
  } else if (validated.databases?.length) {
    args.push("--databases", ...validated.databases);
  } else {
    args.push("--all-databases");
  }

  // Execute mysqldump
  const { stdout, stderr } = await execAsync(
    `mysqldump ${args.join(" ")}`
  );

  // Write through stream pipeline
  await pipeline(
    Readable.from(stdout),
    ...streams,
    createWriteStream(destinationPath)
  );

  return {
    success: true,
    size: (await stat(destinationPath)).size,
    logs: stderr ? [stderr] : [],
  };
}
```

### Restore Implementation

```typescript
async restore(config, sourcePath) {
  const validated = MySQLSchema.parse(config);

  const args = [
    `-h${validated.host}`,
    `-P${validated.port}`,
    `-u${validated.username}`,
    `--password=${validated.password}`,
  ];

  if (validated.database) {
    args.push(validated.database);
  }

  const { stderr } = await execAsync(
    `mysql ${args.join(" ")} < "${sourcePath}"`
  );

  return {
    success: true,
    size: 0,
    logs: stderr ? [stderr] : ["Restore completed"],
  };
}
```

## PostgreSQL Adapter

### Configuration Schema

```typescript
const PostgreSQLSchema = z.object({
  host: z.string().default("localhost"),
  port: z.coerce.number().default(5432),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().optional(),
  databases: z.array(z.string()).optional(),
  sslMode: z.enum(["disable", "require", "verify-ca", "verify-full"]).default("disable"),
});
```

### Environment-Based Authentication

PostgreSQL uses environment variables for password:

```typescript
async dump(config, destinationPath) {
  const validated = PostgreSQLSchema.parse(config);

  const env = {
    ...process.env,
    PGPASSWORD: validated.password,
  };

  const args = [
    `-h`, validated.host,
    `-p`, validated.port.toString(),
    `-U`, validated.username,
    `-F`, "c", // Custom format (compressed)
  ];

  if (validated.database) {
    args.push(`-d`, validated.database);
  }

  args.push(`-f`, destinationPath);

  await execAsync(`pg_dump ${args.join(" ")}`, { env });

  return {
    success: true,
    size: (await stat(destinationPath)).size,
    logs: [],
  };
}
```

## MongoDB Adapter

### Configuration Schema

```typescript
const MongoDBSchema = z.object({
  connectionString: z.string().optional(),
  host: z.string().default("localhost"),
  port: z.coerce.number().default(27017),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  authSource: z.string().default("admin"),
});
```

### Dump Implementation

```typescript
async dump(config, destinationPath) {
  const validated = MongoDBSchema.parse(config);

  let args: string[] = [];

  if (validated.connectionString) {
    args.push(`--uri="${validated.connectionString}"`);
  } else {
    args.push(
      `--host=${validated.host}`,
      `--port=${validated.port}`,
    );

    if (validated.username) {
      args.push(
        `--username=${validated.username}`,
        `--password=${validated.password}`,
        `--authenticationDatabase=${validated.authSource}`,
      );
    }
  }

  if (validated.database) {
    args.push(`--db=${validated.database}`);
  }

  // Output as archive
  args.push(`--archive=${destinationPath}`);

  await execAsync(`mongodump ${args.join(" ")}`);

  return {
    success: true,
    size: (await stat(destinationPath)).size,
    logs: [],
  };
}
```

## SQLite Adapter

SQLite is unique—it's just a file copy:

```typescript
async dump(config, destinationPath) {
  const validated = SQLiteSchema.parse(config);

  // Use .dump command for SQL output
  const { stdout } = await execAsync(
    `sqlite3 "${validated.path}" .dump`
  );

  await writeFile(destinationPath, stdout);

  return {
    success: true,
    size: (await stat(destinationPath)).size,
    logs: ["SQLite database dumped"],
  };
}

// Alternative: Binary copy (faster, smaller)
async dumpBinary(config, destinationPath) {
  const validated = SQLiteSchema.parse(config);
  await copyFile(validated.path, destinationPath);
}
```

## Redis Adapter

Redis is an in-memory key-value store. Backups use the **RDB snapshot** format.

### Configuration Schema

```typescript
const RedisSchema = z.object({
  mode: z.enum(["standalone", "sentinel"]).default("standalone"),
  host: z.string().default("localhost"),
  port: z.coerce.number().default(6379),
  username: z.string().optional(), // Redis 6+ ACL
  password: z.string().optional(),
  database: z.coerce.number().min(0).max(15).default(0),
  tls: z.boolean().default(false),
  sentinelMasterName: z.string().optional(),
  sentinelNodes: z.string().optional(),
  options: z.string().optional(),
});
```

### Dump Implementation

Redis backups download the RDB snapshot directly from the server:

```typescript
async dump(config, destinationPath, onLog) {
  const validated = RedisSchema.parse(config);

  const args = [
    "-h", validated.host,
    "-p", validated.port.toString(),
  ];

  if (validated.password) {
    args.push("-a", validated.password);
  }

  if (validated.tls) {
    args.push("--tls");
  }

  // Download RDB snapshot
  args.push("--rdb", destinationPath);

  // Log command with collapsible details (password masked)
  const maskedArgs = args.map(a => a === validated.password ? "******" : a);
  const command = `redis-cli ${maskedArgs.join(" ")}`;
  onLog?.("Executing redis-cli", "info", "command", command);

  await execAsync(`redis-cli ${args.join(" ")}`);

  return {
    success: true,
    size: (await stat(destinationPath)).size,
    logs: ["RDB snapshot downloaded"],
  };
}
```

::: tip Collapsible Command Logs
Use the fourth parameter (`details`) of `onLog()` to show commands in a collapsible format. This keeps the log clean while making the full command available on click:
```typescript
onLog("Executing backup", "info", "command", fullCommandString);
```
:::
```

### Restore Limitations

::: warning Important
Redis does **not** support remote RDB restore. The RDB file must be:
1. Copied to the server's data directory
2. Server must be restarted to load the new RDB

The restore function provides instructions but cannot perform the actual restore without server filesystem access.
:::

### Key Differences from Other Adapters

| Aspect | Other Databases | Redis |
|--------|-----------------|-------|
| Database Selection | Named databases | Numbered (0-15) |
| Backup Scope | Single/Multiple DBs | Always full server |
| Restore Method | Stream via TCP | File replacement + restart |
| Authentication | User/Password | Optional ACL (Redis 6+) |

## Testing Database Connections

All adapters implement a `test()` method:

```typescript
async test(config): Promise<TestResult> {
  const validated = MySQLSchema.parse(config);

  try {
    // Try a simple query
    await execAsync(
      `mysql -h${validated.host} -P${validated.port} ` +
      `-u${validated.username} --password=${validated.password} ` +
      `-e "SELECT 1"`
    );

    return {
      success: true,
      message: "Connection successful",
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error}`,
    };
  }
}
```

## Listing Databases

The `getDatabases()` method enables the UI to show available databases:

```typescript
async getDatabases(config): Promise<string[]> {
  const validated = MySQLSchema.parse(config);

  const { stdout } = await execAsync(
    `mysql -h${validated.host} -P${validated.port} ` +
    `-u${validated.username} --password=${validated.password} ` +
    `-e "SHOW DATABASES" -N`
  );

  return stdout
    .split("\n")
    .filter(db => !["information_schema", "performance_schema", "sys"].includes(db));
}
```

## Version Detection

Used for restore compatibility checks:

```typescript
async getVersion(config): Promise<string> {
  const validated = MySQLSchema.parse(config);

  const { stdout } = await execAsync(
    `mysql -h${validated.host} -P${validated.port} ` +
    `-u${validated.username} --password=${validated.password} ` +
    `-e "SELECT VERSION()" -N`
  );

  return stdout.trim(); // e.g., "8.0.35"
}
```

## Adding a New Database Adapter

1. **Create schema** in `src/lib/adapters/definitions.ts`
2. **Create adapter** in `src/lib/adapters/database/`
3. **Register** in `src/lib/adapters/index.ts`
4. **Add tests** in `tests/integration/adapters/`
5. **Add container** to `docker-compose.test.yml` if needed

## Multi-Database TAR Format

When backing up multiple databases, all adapters use a unified TAR archive format:

### TAR Archive Structure

```
backup.tar
├── manifest.json        # Metadata about contained databases
├── database1.sql        # MySQL: SQL dump
├── database2.sql
├── database1.dump       # PostgreSQL: Custom format
├── database1.archive    # MongoDB: Archive format
└── ...
```

### Manifest Format

```typescript
interface TarManifest {
  version: 1;
  createdAt: string;        // ISO 8601 timestamp
  sourceType: string;       // 'mysql' | 'postgres' | 'mongodb' | 'mssql'
  engineVersion?: string;   // e.g., '8.0.35'
  totalSize: number;        // Total bytes of all dumps
  databases: DatabaseEntry[];
}

interface DatabaseEntry {
  name: string;             // Original database name
  filename: string;         // File in archive (e.g., 'mydb.sql')
  size: number;             // Size in bytes
  format?: string;          // 'sql' | 'custom' | 'archive' | 'bak'
}
```

### Using TAR Utilities

```typescript
import {
  createMultiDbTar,
  extractMultiDbTar,
  isMultiDbTar,
  readTarManifest,
  shouldRestoreDatabase,
  getTargetDatabaseName,
} from "../common/tar-utils";

// Check if backup is Multi-DB TAR
const isTar = await isMultiDbTar(sourcePath);

// Extract and restore
if (isTar) {
  const { manifest, files } = await extractMultiDbTar(sourcePath, tempDir);

  for (const dbEntry of manifest.databases) {
    if (!shouldRestoreDatabase(dbEntry.name, mapping)) continue;

    const targetDb = getTargetDatabaseName(dbEntry.name, mapping);
    await restoreSingleDatabase(path.join(tempDir, dbEntry.filename), targetDb);
  }
}
```

### Selective Restore

Users can select which databases to restore and rename them:

```typescript
const mapping = [
  { originalName: 'production', targetName: 'staging_copy', selected: true },
  { originalName: 'users', targetName: 'users_test', selected: true },
  { originalName: 'logs', targetName: 'logs', selected: false }, // Skip
];
```

## Custom Restore UI

Some databases require special restore workflows. The restore dialog checks the `sourceType` and renders adapter-specific components:

```typescript
// src/components/dashboard/storage/restore-dialog.tsx
if (file.sourceType?.toLowerCase() === "redis") {
  return <RedisRestoreWizard file={file} storageConfigId={id} onClose={onClose} />;
}
```

### Redis Restore Wizard

Redis cannot restore RDB files remotely - the file must be placed on the server's filesystem and the server restarted. The `RedisRestoreWizard` provides a guided 6-step process:

1. **Intro**: Explains why manual restore is required
2. **Download**: Provides wget/curl commands with token-based authentication
3. **Stop Server**: Shows `redis-cli SHUTDOWN NOSAVE` command
4. **Replace File**: Instructions to replace `dump.rdb`
5. **Start Server**: Commands to restart Redis
6. **Verify**: How to check the restore succeeded

### Token-Based Public Downloads

For wget/curl access (where session cookies aren't available), the app generates temporary download tokens:

```typescript
// src/lib/download-tokens.ts
import { generateDownloadToken, consumeDownloadToken } from "@/lib/download-tokens";

// Generate (5-min TTL, single-use)
const token = await generateDownloadToken(storageConfigId, filePath);

// wget example
`wget "${baseUrl}/api/storage/public-download?token=${token}" -O backup.rdb`

// Consume (returns null if invalid/expired)
const data = consumeDownloadToken(token);
```

The public download endpoint (`/api/storage/public-download`) validates the token and streams the file without requiring session authentication.

## Related Documentation

- [Adapter System](/developer-guide/core/adapters)
- [Storage Adapters](/developer-guide/adapters/storage)
- [Supported Versions](/developer-guide/reference/versions)
