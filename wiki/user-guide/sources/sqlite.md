# SQLite

Configure SQLite databases for backup, both local files and remote via SSH.

## Overview

SQLite is a file-based database. DBackup supports two modes:

| Mode | Description |
| :--- | :--- |
| **Local** | SQLite file on the same machine as DBackup |
| **SSH** | SQLite file on a remote server via SSH |

## Configuration

### Local Mode

| Field | Description |
| :--- | :--- |
| **Mode** | Select "Local" |
| **Path** | Absolute path to `.sqlite` or `.db` file |
| **SQLite Binary** | Path to `sqlite3` binary (default: `sqlite3`) |

### SSH Mode

| Field | Description |
| :--- | :--- |
| **Mode** | Select "SSH" |
| **Host** | SSH server hostname |
| **Port** | SSH port (default: `22`) |
| **Username** | SSH username |
| **Auth Type** | `password`, `privateKey`, or `agent` |
| **Password** | SSH password (if using password auth) |
| **Private Key** | PEM-formatted private key |
| **Passphrase** | Key passphrase (if encrypted) |
| **Path** | Remote path to SQLite file |
| **SQLite Binary** | Remote path to `sqlite3` binary |

## Local Mode Setup

### Docker Configuration

When running DBackup in Docker, mount the SQLite database:

```yaml
services:
  dbackup:
    volumes:
      - /path/to/app/data.db:/data/app.db:ro
```

Then configure the source with path `/data/app.db`.

::: tip Read-Only Mount
Use `:ro` for read-only access to prevent accidental modifications.
:::

### File Permissions

Ensure DBackup can read the file:
```bash
chmod 644 /path/to/database.db
```

## SSH Mode Setup

### Password Authentication

1. Select "SSH" mode
2. Enter host, port, username
3. Select "Password" auth type
4. Enter password
5. Enter remote path to SQLite file

### SSH Key Authentication

1. Select "SSH" mode
2. Enter host, port, username
3. Select "Private Key" auth type
4. Paste your private key (PEM format)
5. Enter passphrase if the key is encrypted

Example private key format:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHI...
-----END OPENSSH PRIVATE KEY-----
```

### SSH Agent

For SSH agent forwarding:
1. Select "SSH" mode
2. Select "Agent" auth type
3. Mount SSH agent socket in Docker:

```yaml
services:
  dbackup:
    volumes:
      - ${SSH_AUTH_SOCK}:/ssh-agent
    environment:
      - SSH_AUTH_SOCK=/ssh-agent
```

## Backup Process

DBackup uses the SQLite `.dump` command:

```bash
sqlite3 /path/to/database.db .dump > backup.sql
```

This creates a text file with:
- Schema definitions (`CREATE TABLE`)
- Data as `INSERT` statements
- Indexes and triggers

### Backup Safety

The dump command is safe to run on a live database:
- Uses SQLite's built-in transaction handling
- Consistent snapshot of data
- No locking issues with WAL mode

## SSH Remote Backup Flow

For SSH mode, the process is:

1. Connect to remote server via SSH
2. Execute `.dump` command remotely
3. Stream output back to DBackup
4. Apply compression/encryption locally
5. Upload to storage destination

This means:
- No large file transfers (streaming)
- Remote server needs `sqlite3` installed
- Bandwidth efficient

## Remote File Browser

When configuring SSH mode, you can:

1. Click "Browse" to open remote file browser
2. Navigate the remote filesystem
3. Select the SQLite database file

This helps find the correct path without manual entry.

## Troubleshooting

### File Not Found

```
Error: unable to open database file
```

**Solutions**:
1. Verify the path is correct
2. Check file permissions
3. For Docker, ensure volume is mounted

### SSH Connection Failed

```
Error: Connection refused
```

**Solutions**:
1. Check SSH server is running
2. Verify port number
3. Check firewall rules
4. Test with `ssh user@host` manually

### Permission Denied (SSH)

```
Error: Permission denied (publickey,password)
```

**Solutions**:
1. Verify credentials
2. Check SSH key format (must be PEM/OpenSSH)
3. Ensure user has shell access

### sqlite3 Not Found

```
Error: sqlite3: command not found
```

**Solutions**:
1. Install SQLite on the remote server
2. Or specify full path in "SQLite Binary" field:
   ```
   /usr/bin/sqlite3
   ```

## Restore

### Local Restore

1. Go to **Storage Explorer**
2. Find your backup file
3. Click **Restore**
4. Select target SQLite source
5. Choose restore mode:
   - **Overwrite**: Replace entire database
   - **Clean Slate**: Delete file first, then restore

### Path Remapping

You can restore to a different path:
1. Enable "Remap Path" option
2. Enter new destination path
3. The backup will be restored to the new location

## Best Practices

1. **Use WAL mode** for better concurrent access:
   ```sql
   PRAGMA journal_mode=WAL;
   ```

2. **Regular VACUUM** before backup for smaller files:
   ```sql
   VACUUM;
   ```

3. **Mount read-only** in Docker when possible

4. **SSH key authentication** is more secure than passwords

5. **Test restore** to verify backup integrity

6. **Enable compression** - SQLite dumps compress very well

7. **Consider encryption** for sensitive data
