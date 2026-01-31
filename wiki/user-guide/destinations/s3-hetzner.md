# Hetzner Object Storage

Store backups in Hetzner Object Storage with EU data residency.

## Overview

Hetzner Object Storage offers S3-compatible storage with:

- 🇪🇺 **EU data residency** (GDPR compliant)
- 💶 Competitive pricing
- 🔒 German infrastructure
- S3-compatible API

## Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Name** | Friendly name | Required |
| **Region** | Hetzner region | `fsn1` |
| **Bucket** | Bucket name | Required |
| **Access Key ID** | S3 credentials | Required |
| **Secret Access Key** | S3 credentials | Required |
| **Path Prefix** | Folder within bucket | **Required** |

::: warning Path Prefix Required
Hetzner Object Storage **requires** a path prefix. It cannot write to the bucket root.
:::

### Regions

| Region | Location |
| :--- | :--- |
| `fsn1` | Falkenstein, Germany |
| `nbg1` | Nuremberg, Germany |
| `hel1` | Helsinki, Finland |
| `ash` | Ashburn, USA |

## Hetzner Setup

### Create Project

1. Login to [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Create a new project (or use existing)

### Enable Object Storage

1. In your project, go to **Object Storage**
2. Create a new bucket
3. Select region

### Generate Credentials

1. Go to **Security** → **API Tokens**
2. Generate S3 credentials
3. Save Access Key and Secret Key

## Configuration Example

```
Region: fsn1
Bucket: my-backups
Access Key ID: xxxxxxxxxxxxxxxx
Secret Access Key: xxxxxxxxxxxxxxxxxxxxxxxx
Path Prefix: /database-backups
```

Endpoint is auto-generated:
```
https://fsn1.your-objectstorage.com
```

## Pricing

| Resource | Price |
| :--- | :--- |
| Storage | €0.0049/GB/month (~$0.005) |
| Egress | €0.01/GB |
| Requests | Free |

Very competitive compared to major cloud providers.

## GDPR Compliance

Hetzner's EU-based infrastructure helps with GDPR:

- Data stored in EU/EEA
- German company (Hetzner Online GmbH)
- No US data transfers for EU regions
- DPA (Data Processing Agreement) available

### Compliance Configuration

For maximum GDPR compliance:
1. Use EU regions (`fsn1`, `nbg1`, `hel1`)
2. Enable DBackup encryption
3. Document in your records of processing

## Features

### Bucket Versioning

Enable via API or Hetzner Console for backup protection.

### Lifecycle Rules

Configure automatic deletion of old versions.

### Public Access

Can be disabled for private buckets (recommended).

## Troubleshooting

### Invalid Credentials

```
InvalidAccessKeyId
```

**Solutions**:
1. Regenerate S3 credentials in Hetzner Console
2. Verify no extra spaces
3. Check credentials match region

### Access Denied on Root

```
AccessDenied when writing to /
```

**Solution**: Set a **Path Prefix** (required for Hetzner).

### Bucket Not Found

```
NoSuchBucket
```

**Solutions**:
1. Create bucket in Hetzner Console
2. Verify bucket name matches exactly
3. Check region is correct

### Region Mismatch

```
PermanentRedirect
```

**Solution**: Ensure region in DBackup matches bucket region.

## Integration with Hetzner Cloud

### VPS in Same Datacenter

Lower latency when DBackup runs on Hetzner:
- Use same region for VPS and Object Storage
- Internal network speeds

### Load Balancer

Combine with Hetzner Load Balancer for HA setups.

## Security

### Network Security

- Enable firewall rules
- Use VPN for management access
- Consider private networking

### Encryption

Multiple layers available:
1. **Transit**: TLS (automatic)
2. **Server-side**: Hetzner encryption
3. **Client-side**: DBackup Encryption Profiles

### Access Control

Currently limited compared to AWS:
- Single credential per project
- Use separate projects for isolation

## Best Practices

1. **Use path prefixes** to organize backups
2. **Enable DBackup retention** for automatic cleanup
3. **Use EU regions** for GDPR compliance
4. **Enable encryption** for sensitive data
5. **Monitor costs** in Hetzner Console
6. **Regular restore tests** to verify integrity

## Migration

### From Other S3 Storage

Use rclone for migration:

```bash
rclone copy s3:source-bucket hetzner:dest-bucket/prefix --progress
```

### To Hetzner

1. Create Hetzner destination in DBackup
2. Run parallel backups to both destinations
3. Verify Hetzner backups
4. Update jobs to use Hetzner only

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Storage Explorer](/user-guide/features/storage-explorer)
