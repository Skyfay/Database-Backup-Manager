# Rsync (SSH)

Store backups on any remote server using rsync's efficient delta-transfer algorithm over SSH.

## Overview

Rsync is a fast, versatile file synchronization tool that uses SSH for secure transfer. Benefits:

- ⚡ Delta transfers — only changed blocks are sent
- 🔒 Encrypted transfer (SSH)
- 🗜️ Built-in transfer compression
- 🖥️ Works with any Linux/macOS server
- 🔑 Multiple authentication methods (Password, SSH Key, SSH Agent)
- ⚙️ Customizable with additional rsync flags

## Prerequisites

::: warning System Requirements
The Rsync adapter requires the following CLI tools on the **DBackup host**:

- `rsync` — File synchronization (pre-installed on most systems)
- `openssh-client` — SSH connectivity
- `sshpass` — Only needed for password authentication

These are pre-installed in the official Docker image. For local development on macOS, see the [setup section](#macos-development-setup) below.
:::

## Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Name** | Friendly name | Required |
| **Host** | Server hostname or IP | Required |
| **Port** | SSH port | `22` |
| **Username** | SSH username | Required |
| **Auth Type** | Authentication method | `password` |
| **Password** | SSH password | Conditional |
| **Private Key** | SSH key (PEM format) | Conditional |
| **Passphrase** | Key passphrase | Optional |
| **Path Prefix** | Remote directory for backups | Required |
| **Options** | Additional rsync flags | Optional |

## Authentication Methods

### Password Authentication

Simplest setup — requires `sshpass` on the host:
1. Select **Auth Type**: `password`
2. Enter username and password

::: tip Security
Passwords are never passed as command-line arguments. DBackup uses the `SSHPASS` environment variable exclusively, preventing exposure in process listings.
:::

### SSH Key Authentication

More secure, recommended for production:
1. Select **Auth Type**: `privateKey`
2. Paste your private key (PEM format)
3. Enter passphrase if key is encrypted

Supported key formats:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHI...
-----END OPENSSH PRIVATE KEY-----
```

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
```

### SSH Agent

For environments with SSH agent forwarding:
1. Select **Auth Type**: `agent`
2. Mount SSH socket in Docker:

```yaml
services:
  dbackup:
    volumes:
      - ${SSH_AUTH_SOCK}:/ssh-agent:ro
    environment:
      - SSH_AUTH_SOCK=/ssh-agent
```

## Server Setup

### Create Backup User

```bash
# Create user
sudo useradd -m -s /bin/bash backupuser

# Create backup directory
sudo mkdir -p /backups/rsync
sudo chown backupuser:backupuser /backups/rsync

# Set password (if using password auth)
sudo passwd backupuser
```

### SSH Key Setup

```bash
# Generate key pair (on your machine)
ssh-keygen -t ed25519 -f ~/.ssh/dbackup_rsync_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/dbackup_rsync_key.pub backupuser@server
```

### Install rsync on Target Server

Most Linux distributions include rsync, but verify:

```bash
# Debian/Ubuntu
sudo apt install rsync

# RHEL/CentOS/Fedora
sudo dnf install rsync

# Alpine
apk add rsync
```

## Path Prefix

The **Path Prefix** defines the base directory on the remote server where all backups are stored. The user must have write permissions to this directory.

::: warning Permission Denied
If you see "Permission denied: Cannot create directory", the SSH user does not have write access to the specified path. Use a path within the user's home directory:
- ✅ `/home/backupuser/backups`
- ✅ `~/backups`
- ❌ `/backups` (requires root or explicit permissions)
:::

## Additional Options

The **Options** field allows passing extra rsync flags:

| Option | Description |
| :--- | :--- |
| `--bwlimit=5000` | Limit bandwidth to 5000 KB/s |
| `--timeout=300` | Set I/O timeout to 300 seconds |
| `--exclude=*.tmp` | Exclude files matching pattern |
| `--compress-level=9` | Maximum compression level |

Example: `--bwlimit=10000 --timeout=600`

## Directory Structure

After backups, your server will have:

```
/home/backupuser/backups/
├── mysql-daily/
│   ├── backup_2026-02-14T12-00-00.sql.gz
│   ├── backup_2026-02-14T12-00-00.sql.gz.meta.json
│   └── ...
└── postgres-weekly/
    └── ...
```

## Docker Configuration

The official Docker image includes all required tools. No additional configuration needed:

```yaml
services:
  dbackup:
    image: skyfay/dbackup:beta
    # rsync, sshpass, openssh-client are pre-installed
```

For SSH Agent forwarding in Docker:

```yaml
services:
  dbackup:
    image: skyfay/dbackup:beta
    volumes:
      - ${SSH_AUTH_SOCK}:/ssh-agent:ro
    environment:
      - SSH_AUTH_SOCK=/ssh-agent
```

## macOS Development Setup

For local development, install the required tools:

```bash
# rsync (macOS ships with an older version)
brew install rsync

# sshpass (only needed for password auth)
brew install hudochenkov/sshpass/sshpass
```

## Rsync vs SFTP

Both use SSH for transfer, but rsync has unique advantages:

| Feature | Rsync | SFTP |
| :--- | :--- | :--- |
| Delta transfers | ✅ Only changed blocks | ❌ Full file transfer |
| Transfer compression | ✅ Built-in | ❌ Via DBackup only |
| Bandwidth limiting | ✅ `--bwlimit` flag | ❌ Not supported |
| CLI dependency | ✅ Required on both ends | ❌ Uses npm package |
| Custom options | ✅ Extensive | ❌ Limited |
| Resume interrupted | ✅ `--partial` flag | ❌ Restart required |

**Use Rsync when:** You need efficient incremental transfers, bandwidth control, or are syncing large backup files repeatedly.

**Use SFTP when:** You want zero CLI dependencies, or the target server doesn't have rsync installed.

## Troubleshooting

### Connection Refused

```
connect ECONNREFUSED
```

**Solutions**:
1. Verify SSH is running: `systemctl status sshd`
2. Check firewall allows the SSH port
3. Verify hostname/IP is correct

### Too Many Authentication Failures

```
Too many authentication failures
```

**Solutions**:
1. Ensure you're using **Password** auth type (not Agent)
2. DBackup automatically disables public key auth for password connections
3. Check that SSH agent isn't loaded with many keys

### Permission Denied

```
Permission denied: Cannot create directory
```

**Solutions**:
1. Use a path the user owns (e.g., `/home/user/backups`)
2. Create the directory manually and set ownership:
   ```bash
   sudo mkdir -p /backups && sudo chown user:user /backups
   ```
3. Check SELinux/AppArmor policies

### sshpass Not Found

```
Password authentication requires 'sshpass' to be installed
```

**Solutions**:
1. Use the official Docker image (includes sshpass)
2. Install manually:
   - Debian/Ubuntu: `sudo apt install sshpass`
   - macOS: `brew install hudochenkov/sshpass/sshpass`
   - Alpine: `apk add sshpass`
3. Or switch to SSH Key / Agent authentication

### rsync Not Found on Remote

```
rsync: command not found
```

**Solution**: Install rsync on the target server:
```bash
sudo apt install rsync    # Debian/Ubuntu
sudo dnf install rsync    # RHEL/Fedora
apk add rsync             # Alpine
```

## Security Best Practices

1. **Use SSH keys** instead of passwords
2. **Disable root login** via SSH
3. **Restrict backup user** permissions to the backup directory only
4. **Use non-standard SSH port** (security by obscurity)
5. **Enable fail2ban** for brute-force protection
6. **Limit bandwidth** with `--bwlimit` to avoid saturating the network
7. **Firewall rules** to limit source IPs

## Comparison with Other Destinations

| Feature | Rsync | SFTP | S3 | Local |
| :--- | :--- | :--- | :--- | :--- |
| Setup complexity | Medium | Medium | Easy | Easiest |
| Self-hosted | ✅ | ✅ | ❌ | ✅ |
| Delta transfers | ✅ | ❌ | ❌ | N/A |
| Encryption in transit | ✅ | ✅ | ✅ | N/A |
| Bandwidth control | ✅ | ❌ | ❌ | N/A |
| Scalability | Limited | Limited | High | Limited |
| CLI dependency | Yes | No | No | No |
| Cost | Server cost | Server cost | Pay-per-use | Free |

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Storage Explorer](/user-guide/features/storage-explorer)
