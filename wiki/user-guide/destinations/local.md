# Local Filesystem

Store backups on the local filesystem where DBackup is running.

## Overview

The Local Filesystem adapter is the simplest storage option. Backups are stored directly on disk, making it ideal for:

- Development and testing
- Quick setup without external dependencies
- First-stage backup before cloud sync
- Air-gapped environments

## Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Name** | Friendly name for this destination | Required |
| **Base Path** | Absolute path to store backups | `/backups` |

## Docker Setup

When running DBackup in Docker, mount a host directory:

```yaml
services:
  dbackup:
    volumes:
      - ./backups:/backups
```

Then configure the destination with **Base Path**: `/backups`

### Directory Structure

After backups run:

```
./backups/
├── my-mysql-job/
│   ├── backup_2024-01-15T12-00-00.sql
│   ├── backup_2024-01-15T12-00-00.sql.meta.json
│   └── ...
└── my-postgres-job/
    └── ...
```

## Permissions

Ensure the DBackup process can write to the directory:

```bash
# Create directory
mkdir -p ./backups

# Set permissions (Docker runs as UID 1000)
sudo chown -R 1000:1000 ./backups
```

### Docker User

If using a custom user in Docker:

```yaml
services:
  dbackup:
    user: "1000:1000"
    volumes:
      - ./backups:/backups
```

## Multiple Paths

You can create multiple local destinations for different purposes:

- `/backups/daily` - Frequent backups
- `/backups/weekly` - Weekly archives
- `/backups/critical` - Important snapshots

Each with different retention policies.

## Network Storage

The local adapter works with mounted network storage:

### NFS Mount

```bash
# Mount NFS share
sudo mount -t nfs server:/backup-share /mnt/backups

# Add to fstab for persistence
echo "server:/backup-share /mnt/backups nfs defaults 0 0" | sudo tee -a /etc/fstab
```

Then use `/mnt/backups` as the base path.

### CIFS/SMB Mount

```bash
# Mount Windows share
sudo mount -t cifs //server/backups /mnt/backups -o username=user,password=pass

# In Docker, mount the host path
volumes:
  - /mnt/backups:/backups
```

## Test Connection

The test verifies:
1. Directory exists (or can be created)
2. Write permission (creates test file)
3. Delete permission (removes test file)

## Troubleshooting

### Permission Denied

```
Error: EACCES: permission denied
```

**Solutions**:
1. Check directory ownership: `ls -la /backups`
2. Set correct permissions: `chmod 755 /backups`
3. Verify Docker volume mount

### Directory Not Found

```
Error: ENOENT: no such file or directory
```

**Solutions**:
1. Create the directory: `mkdir -p /backups`
2. Verify volume mount in Docker Compose
3. Check the path is absolute (starts with `/`)

### Disk Full

```
Error: ENOSPC: no space left on device
```

**Solutions**:
1. Check disk space: `df -h`
2. Enable retention policies to auto-delete old backups
3. Use compression to reduce backup size
4. Expand disk or use external storage

## Best Practices

1. **Use dedicated disk/partition** to prevent filling up system disk
2. **Enable compression** to maximize storage efficiency
3. **Configure retention** to automatically clean up
4. **Regular monitoring** of disk usage
5. **Consider offsite copy** for disaster recovery
6. **Test restores** periodically

## Backup Strategy

Local filesystem works best as part of a 3-2-1 backup strategy:

- **3** copies of data
- **2** different storage types
- **1** offsite location

Example setup:
1. Local filesystem (fast access)
2. S3-compatible storage (redundancy)
3. Offsite backup (disaster recovery)

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Set Up Notifications](/user-guide/features/notifications)
