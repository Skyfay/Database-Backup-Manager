# Redis

Redis is an in-memory data structure store used as a database, cache, message broker, and streaming engine. DBackup supports Redis backups using the native RDB snapshot format.

## Supported Versions

| Versions |
| :--- |
| 6.x, 7.x, 8.x |

## Architecure

DBackup uses `redis-cli --rdb` to download RDB snapshots.

- Creates a consistent snapshot of all data
- Works with any Redis deployment (standalone, Sentinel)
- Doesn't require filesystem access to the Redis server
- Includes all 16 databases (0-15) in a single backup

## Configuration

### Basic Settings

| Field | Description | Default |
| :--- | :--- | :--- |
| **Host** | Redis server hostname or IP | `localhost` |
| **Port** | Redis server port | `6379` |
| **Password** | Optional authentication password | - |
| **Database** | Database index (0-15) for display purposes | `0` |

### Advanced Settings

| Field | Description | Default |
| :--- | :--- | :--- |
| **Username** | Redis 6+ ACL username | - |
| **TLS** | Enable TLS/SSL connection | `false` |
| **Mode** | Connection mode: `standalone` or `sentinel` | `standalone` |
| **Sentinel Master Name** | Master name for Sentinel mode | - |
| **Sentinel Nodes** | Comma-separated Sentinel node addresses | - |
| **Additional Options** | Extra `redis-cli` flags | - |

## Example Configuration

### Standalone Redis

```
Host: redis.example.com
Port: 6379
Password: your-redis-password
```

### Redis with ACL (6.0+)

```
Host: redis.example.com
Port: 6379
Username: backup-user
Password: user-password
```

### Redis with TLS

```
Host: redis.example.com
Port: 6379
Password: your-password
TLS: Enabled
```

### Redis Sentinel

```
Mode: sentinel
Sentinel Master Name: mymaster
Sentinel Nodes: sentinel1:26379,sentinel2:26379,sentinel3:26379
Password: your-password
```

## Backup File Format

Redis backups are stored as `.rdb` files - the native Redis snapshot format:

- **Uncompressed**: `backup_2026-02-02.rdb`
- **Compressed**: `backup_2026-02-02.rdb.gz`
- **Encrypted**: `backup_2026-02-02.rdb.gz.enc`

## Restore Limitations

::: warning Important
Redis cannot restore RDB files remotely via network commands. Restoring a Redis backup requires:

1. **Server access**: You need filesystem access to the Redis server
2. **Service restart**: Redis must be stopped and restarted to load the new RDB file

DBackup provides a **Restore Wizard** that guides you through the manual restore process with copy-paste commands.
:::

### Restore Process (Manual)

1. **Download the backup** from Storage Explorer
2. **Stop the Redis server**: `redis-cli SHUTDOWN NOSAVE`
3. **Replace the RDB file**: Copy backup to Redis data directory (usually `/var/lib/redis/dump.rdb`)
4. **Start Redis**: `systemctl start redis` or `redis-server`
5. **Verify**: Connect and check your data

### Using the Restore Wizard

When you click "Restore" on a Redis backup in Storage Explorer, DBackup opens a guided wizard that:

- Provides download commands (wget/curl with authentication)
- Shows the exact commands for your deployment type
- Includes commands for both Systemd and Docker deployments

## Database Selection

Unlike relational databases, Redis uses numbered databases (0-15). When configuring a Redis source:

- **All databases** are always backed up together in the RDB snapshot
- The "Database" field is for display and connection testing only
- You cannot selectively backup individual Redis databases

## Required CLI Tools

The Redis adapter requires `redis-cli` to be installed on the DBackup server:

**Docker**: Already included in the DBackup image.

**Manual Installation**:
```bash
# Ubuntu/Debian
apt-get install redis-tools

# macOS
brew install redis

# Alpine
apk add redis
```

## Troubleshooting

### Connection Refused

Ensure Redis is configured to accept remote connections:

```conf
# redis.conf
bind 0.0.0.0
protected-mode no  # Or use password authentication
```

### Authentication Failed

For Redis 6+ with ACL:
- Ensure the user has the `+sync` and `+psync` permissions for RDB downloads
- Or use the default user with the `requirepass` password

### TLS Certificate Errors

If using self-signed certificates, you may need to add `--insecure` to the Additional Options field.

## See Also

- [Storage Explorer](/user-guide/features/storage-explorer) - Browse and download backups
- [Restore Guide](/user-guide/features/restore) - General restore documentation
- [Encryption](/user-guide/security/encryption) - Encrypting your backups
