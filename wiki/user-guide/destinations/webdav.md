# WebDAV

Store backups on any WebDAV-compatible server — Nextcloud, ownCloud, Apache, Nginx, or any other WebDAV endpoint.

## Overview

WebDAV (Web Distributed Authoring and Versioning) is an extension of HTTP that allows clients to manage files on remote servers. Benefits:

- 🌐 Works over HTTP/HTTPS — no special ports or protocols
- 🔒 HTTPS encryption in transit by default
- 📁 Native support in Nextcloud, ownCloud, Synology, and many NAS devices
- 🔑 Simple username/password authentication

## Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Name** | Friendly name | Required |
| **URL** | WebDAV server URL | Required |
| **Username** | WebDAV username | Required |
| **Password** | WebDAV password | Optional |
| **Path Prefix** | Subdirectory for backups | Optional |

## Setup Examples

### Nextcloud

1. Ensure WebDAV is enabled (it is by default)
2. Create a dedicated user or use an existing account
3. Configure in DBackup:
   - **URL**: `https://nextcloud.example.com/remote.php/dav/files/USERNAME/`
   - **Username**: `backupuser`
   - **Password**: Your password or an app password
   - **Path Prefix**: `backups/server1`

::: tip App Passwords
For security, create a dedicated app password in Nextcloud under **Settings > Security > App passwords** instead of using your main password.
:::

### ownCloud

1. WebDAV is enabled by default
2. Configure in DBackup:
   - **URL**: `https://owncloud.example.com/remote.php/dav/files/USERNAME/`
   - **Username**: `backupuser`
   - **Password**: Your password
   - **Path Prefix**: `backups`

### Synology NAS (WebDAV)

1. Install the **WebDAV Server** package from Package Center
2. Enable HTTPS in **WebDAV Server > Settings**
3. Configure in DBackup:
   - **URL**: `https://synology-ip:5006`
   - **Username**: `backupuser`
   - **Password**: Your password
   - **Path Prefix**: `backups`

### Apache (mod_dav)

1. Enable modules: `a2enmod dav dav_fs`
2. Configure a WebDAV directory in your Apache config:

```apache
<Directory /var/www/webdav>
    Dav On
    AuthType Basic
    AuthName "WebDAV"
    AuthUserFile /etc/apache2/.htpasswd
    Require valid-user
</Directory>
```

3. Create the htpasswd file: `htpasswd -c /etc/apache2/.htpasswd backupuser`
4. Restart Apache: `sudo systemctl restart apache2`
5. Configure in DBackup:
   - **URL**: `https://server.example.com/webdav`
   - **Username**: `backupuser`
   - **Password**: Your htpasswd password

### Nginx (nginx-dav-ext-module)

1. Install Nginx with DAV support
2. Add a WebDAV location block:

```nginx
location /webdav {
    alias /var/www/webdav;
    dav_methods PUT DELETE MKCOL COPY MOVE;
    dav_ext_methods PROPFIND OPTIONS;
    dav_access user:rw group:rw all:r;

    auth_basic "WebDAV";
    auth_basic_user_file /etc/nginx/.htpasswd;

    create_full_put_path on;
    autoindex on;
}
```

3. Create htpasswd: `htpasswd -c /etc/nginx/.htpasswd backupuser`
4. Restart Nginx: `sudo systemctl restart nginx`
5. Configure in DBackup:
   - **URL**: `https://server.example.com/webdav`
   - **Username**: `backupuser`
   - **Password**: Your htpasswd password

## Directory Structure

After backups, your WebDAV server will contain:

```
/your-prefix/
├── mysql-daily/
│   ├── backup_2024-01-15T12-00-00.sql.gz
│   ├── backup_2024-01-15T12-00-00.sql.gz.meta.json
│   └── ...
└── postgres-weekly/
    └── ...
```

## Docker Configuration

The WebDAV adapter uses the `webdav` npm package and requires no additional system dependencies. It works out of the box in both Docker and local development environments.

## Troubleshooting

### Connection Failed

```
401 Unauthorized
```

**Solutions**:
1. Verify username and password are correct
2. For Nextcloud/ownCloud, try using an app password
3. Ensure the WebDAV endpoint URL is correct

### Forbidden

```
403 Forbidden
```

**Solutions**:
1. Check file/folder permissions on the server
2. Verify the user has write access to the target directory
3. Check if server-side security rules (e.g., fail2ban) are blocking requests

### Not Found

```
404 Not Found
```

**Solutions**:
1. Verify the WebDAV URL is correct
2. For Nextcloud: ensure URL includes `/remote.php/dav/files/USERNAME/`
3. Check that the WebDAV service is enabled on the server

### SSL Certificate Errors

```
UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

**Solutions**:
1. Use a valid SSL certificate (e.g., Let's Encrypt)
2. For self-signed certificates in development, set `NODE_TLS_REJECT_UNAUTHORIZED=0` (not recommended for production)

### File Size Limits

Some WebDAV servers impose upload size limits:

**Solutions**:
1. Apache: Increase `LimitRequestBody` directive
2. Nginx: Increase `client_max_body_size` directive
3. Nextcloud: Adjust `upload_max_filesize` and `post_max_size` in PHP config

## Security Best Practices

1. **Use HTTPS** — Always use TLS-encrypted connections
2. **App passwords** — Use dedicated app passwords instead of main account passwords
3. **Dedicated user** — Create a separate account for backups with minimal permissions
4. **Path isolation** — Restrict the backup user to a specific directory
5. **Firewall rules** — Limit which IPs can access the WebDAV endpoint
6. **Enable backup encryption** — Use DBackup's encryption profiles for at-rest encryption

## Comparison with Other Destinations

| Feature | WebDAV | SFTP | SMB | S3 | Local |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Setup complexity | Easy | Medium | Easy | Easy | Easiest |
| Works over internet | ✅ | ✅ | ❌ | ✅ | ❌ |
| HTTPS encryption | ✅ | N/A (SSH) | ❌ | ✅ | N/A |
| Nextcloud/ownCloud | ✅ | ❌ | ❌ | ❌ | ❌ |
| NAS support | ✅ | ✅ | ✅ | ❌ | ❌ |
| Self-hosted | ✅ | ✅ | ✅ | ❌ | ✅ |
| No CLI dependency | ✅ | ✅ | ❌ | ✅ | ✅ |

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Storage Explorer](/user-guide/features/storage-explorer)
