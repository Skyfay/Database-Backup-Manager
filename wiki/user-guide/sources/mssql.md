# Microsoft SQL Server

Configure Microsoft SQL Server databases for backup.

## Supported Versions

| Version | Notes |
| :--- | :--- |
| SQL Server 2017 | v14.x |
| SQL Server 2019 | v15.x |
| SQL Server 2022 | v16.x |
| Azure SQL Edge | Container-based |

## Architecture

Unlike other database adapters that use CLI dump tools, SQL Server backup uses:

1. **T-SQL `BACKUP DATABASE`** command
2. Native `.bak` format (full database backup)
3. Shared volume for file transfer

This means the backup file is created **on the SQL Server** first, then transferred to DBackup.

## Configuration

### Basic Settings

| Field | Description | Default |
| :--- | :--- | :--- |
| **Host** | SQL Server hostname | `localhost` |
| **Port** | SQL Server port | `1433` |
| **User** | SQL Server login | Required |
| **Password** | Login password | Required |
| **Database** | Database name(s) to backup | Required |

### Advanced Settings

| Field | Description | Default |
| :--- | :--- | :--- |
| **Encrypt** | Use encrypted connection | `true` |
| **Trust Server Certificate** | Trust self-signed certs | `false` |
| **Backup Path** | Server-side backup directory | `/var/opt/mssql/backup` |
| **Local Backup Path** | Host-side mounted path | `/tmp` |
| **Request Timeout** | Query timeout in ms | `300000` (5 min) |
| **Additional Options** | Extra BACKUP options | - |

## Shared Volume Setup

The key to SQL Server backup is the **shared volume**. Both SQL Server and DBackup must access the same directory:

```yaml
services:
  dbackup:
    volumes:
      - ./mssql-backups:/mssql-backups
    # Configure in source:
    # - Backup Path: /var/opt/mssql/backup
    # - Local Backup Path: /mssql-backups

  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    volumes:
      - ./mssql-backups:/var/opt/mssql/backup
```

### How It Works

1. DBackup sends `BACKUP DATABASE` command to SQL Server
2. SQL Server writes `.bak` file to `/var/opt/mssql/backup`
3. DBackup reads the file from `/mssql-backups` (same volume)
4. DBackup processes (compress/encrypt) and uploads to destination
5. Cleanup: Original `.bak` file is deleted

## Setting Up a Backup User

Create a dedicated login with backup permissions:

```sql
-- Create login
CREATE LOGIN dbackup WITH PASSWORD = 'secure_password_here';

-- Create user in master
USE master;
CREATE USER dbackup FOR LOGIN dbackup;

-- Grant backup permissions
ALTER SERVER ROLE [db_backupoperator] ADD MEMBER dbackup;

-- Or grant on specific databases:
USE mydb;
CREATE USER dbackup FOR LOGIN dbackup;
ALTER ROLE [db_backupoperator] ADD MEMBER dbackup;
```

For restore operations:
```sql
ALTER SERVER ROLE [dbcreator] ADD MEMBER dbackup;
```

## Backup Process

DBackup executes:

```sql
BACKUP DATABASE [MyDatabase]
TO DISK = '/var/opt/mssql/backup/backup_20240115_120000.bak'
WITH FORMAT, INIT, COMPRESSION
```

### Backup Options

Add custom options in "Additional Options":

```sql
-- With checksum verification
CHECKSUM

-- With differential backup
DIFFERENTIAL

-- Copy-only (doesn't break log chain)
COPY_ONLY

-- Custom description
DESCRIPTION = 'Daily backup'
```

## Connection Security

### Encrypted Connection (Recommended)

Enable **Encrypt** option for production:
- Requires valid SSL certificate on SQL Server
- Or enable **Trust Server Certificate** for self-signed

### Azure SQL

For Azure SQL Database:
1. Enable **Encrypt**
2. Keep **Trust Server Certificate** disabled
3. Use Azure AD authentication if needed

## Troubleshooting

### Connection Timeout

```
Login failed. The login is from an untrusted domain
```

**Solutions**:
1. Increase **Request Timeout** for large databases
2. Check network latency
3. Verify SQL Server is accessible

### Backup Permission Denied

```
Cannot open backup device. Operating system error 5 (Access denied)
```

**Solutions**:
1. SQL Server service account needs write access to backup path
2. Check volume mount permissions
3. Verify the backup directory exists

### File Not Found After Backup

```
Backup completed but file not found
```

**Solutions**:
1. Verify shared volume is mounted correctly
2. Check **Backup Path** matches SQL Server mount
3. Check **Local Backup Path** matches DBackup mount
4. Verify paths are absolute

### SSL Certificate Error

```
The certificate chain was issued by an authority that is not trusted
```

**Solutions**:
1. Enable **Trust Server Certificate** (development only)
2. Install valid SSL certificate on SQL Server
3. Add CA certificate to DBackup container

## Azure SQL Edge (Docker)

For containerized development:

```yaml
services:
  mssql:
    image: mcr.microsoft.com/azure-sql-edge:latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Password123
    ports:
      - "1433:1433"
    volumes:
      - ./mssql-backups:/var/opt/mssql/backup
```

Configure source:
- **Host**: `mssql` (service name) or `host.docker.internal`
- **User**: `sa`
- **Encrypt**: `false`
- **Trust Server Certificate**: `true`

## Restore

To restore a SQL Server backup:

1. Go to **Storage Explorer**
2. Find your `.bak` backup file
3. Click **Restore**
4. Select target database configuration
5. Choose:
   - Restore to same database (overwrite)
   - Restore to new database name
6. Confirm and monitor progress

### Restore Process

1. Download `.bak` file to shared volume
2. Execute `RESTORE DATABASE` command
3. Verify restore integrity
4. Cleanup temporary files

## Best Practices

1. **Use shared volumes** with proper permissions
2. **Enable COMPRESSION** in backup options (reduces size 60-80%)
3. **Use CHECKSUM** for integrity verification
4. **Test restores** regularly
5. **Monitor backup duration** and adjust timeout
6. **Use encrypted connections** in production
7. **Separate backup user** from application user
