# SFTP (SSH File Transfer Protocol)

Store backups on any server with SSH access.

## Overview

SFTP uses the SSH protocol for secure file transfer. Benefits:

- 🔒 Encrypted transfer (SSH)
- 🖥️ Works with existing servers
- 🔑 Multiple authentication methods
- 📁 Standard filesystem access

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
| **Path Prefix** | Remote directory | Optional |

## Authentication Methods

### Password Authentication

Simplest setup:
1. Select **Auth Type**: `password`
2. Enter username and password

### SSH Key Authentication

More secure:
1. Select **Auth Type**: `privateKey`
2. Paste your private key (PEM format)
3. Enter passphrase if key is encrypted

Example key format:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHI...
-----END OPENSSH PRIVATE KEY-----
```

Or older RSA format:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
```

### SSH Agent

For environments with SSH agent:
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
sudo mkdir -p /backups
sudo chown backupuser:backupuser /backups

# Set password (if using password auth)
sudo passwd backupuser
```

### SSH Key Setup

```bash
# Generate key pair (on your machine)
ssh-keygen -t ed25519 -f ~/.ssh/dbackup_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/dbackup_key.pub backupuser@server

# Or manually add to authorized_keys
cat ~/.ssh/dbackup_key.pub | ssh backupuser@server "cat >> ~/.ssh/authorized_keys"
```

### Restrict User (Optional)

For security, limit the backup user:

```bash
# /etc/ssh/sshd_config
Match User backupuser
    ChrootDirectory /backups
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

Restart SSH: `sudo systemctl restart sshd`

## Directory Structure

After backups, your server will have:

```
/backups/
├── mysql-daily/
│   ├── backup_2024-01-15T12-00-00.sql.gz
│   ├── backup_2024-01-15T12-00-00.sql.gz.meta.json
│   └── ...
└── postgres-weekly/
    └── ...
```

## Storage on NAS Devices

### Synology

1. Enable SFTP in Control Panel → File Services
2. Create user with access to backup folder
3. Note: Use IP address, not hostname

### QNAP

1. Enable SFTP in Control Panel → Network Services
2. Create backup user with folder permissions

### TrueNAS

1. Enable SSH service
2. Create user and dataset for backups
3. Configure permissions

## Troubleshooting

### Connection Refused

```
connect ECONNREFUSED
```

**Solutions**:
1. Verify SSH is running: `systemctl status sshd`
2. Check firewall allows port 22
3. Verify hostname/IP is correct

### Authentication Failed

```
All configured authentication methods failed
```

**Solutions**:
1. Verify username is correct
2. Check password or key
3. Verify key format (must be PEM)
4. Check server allows auth method

### Permission Denied (Writing)

```
Permission denied
```

**Solutions**:
1. Check user owns backup directory
2. Verify write permissions: `chmod 755 /backups`
3. Check SELinux/AppArmor policies

### Host Key Verification

```
Host key verification failed
```

**Solutions**:
1. DBackup auto-accepts host keys
2. If persistent, server may have changed
3. Check for MITM attacks

### Key Format Issues

```
Unsupported key format
```

**Solution**: Convert to PEM format:
```bash
# Convert OpenSSH to PEM
ssh-keygen -p -m PEM -f ~/.ssh/id_rsa
```

## Performance

### Optimize for Large Backups

1. Enable compression in DBackup (reduces transfer)
2. Use faster ciphers:
   ```
   # Server /etc/ssh/sshd_config
   Ciphers chacha20-poly1305@openssh.com,aes128-ctr
   ```

### Network Considerations

- Use gigabit connection for large backups
- Consider local network over internet
- Monitor bandwidth usage

## Security Best Practices

1. **Use SSH keys** instead of passwords
2. **Disable root login** via SSH
3. **Restrict backup user** to SFTP only
4. **Use non-standard port** (security by obscurity)
5. **Enable fail2ban** for brute-force protection
6. **Regular key rotation**
7. **Firewall rules** to limit source IPs

### Firewall Example

```bash
# UFW
sudo ufw allow from 10.0.0.0/8 to any port 22

# iptables
iptables -A INPUT -p tcp -s 10.0.0.0/8 --dport 22 -j ACCEPT
```

## Comparison with Other Destinations

| Feature | SFTP | S3 | Local |
| :--- | :--- | :--- | :--- |
| Setup complexity | Medium | Easy | Easiest |
| Self-hosted | ✅ | ❌ | ✅ |
| Encryption in transit | ✅ | ✅ | N/A |
| Scalability | Limited | High | Limited |
| Cost | Server cost | Pay-per-use | Free |

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Storage Explorer](/user-guide/features/storage-explorer)
