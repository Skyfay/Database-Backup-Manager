# S3 Compatible Storage

Store backups on any S3-compatible object storage service, including MinIO, DigitalOcean Spaces, Backblaze B2, and others.

## Overview

The S3 Generic adapter works with any storage service implementing the S3 API:

- **MinIO** - Self-hosted object storage
- **DigitalOcean Spaces** - Managed object storage
- **Backblaze B2** - Low-cost cloud storage
- **Wasabi** - Hot cloud storage
- **Linode Object Storage**
- **Scaleway Object Storage**
- And many more...

## Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Name** | Friendly name for this destination | Required |
| **Endpoint** | S3 API endpoint URL | Required |
| **Region** | Region identifier | `us-east-1` |
| **Bucket** | Bucket name | Required |
| **Access Key ID** | Access key | Required |
| **Secret Access Key** | Secret key | Required |
| **Force Path Style** | Use path-style URLs | `false` |
| **Path Prefix** | Folder within bucket | Optional |

### Force Path Style

Two URL styles exist for S3:
- **Virtual-hosted**: `bucket.endpoint.com/object`
- **Path-style**: `endpoint.com/bucket/object`

Enable **Force Path Style** for:
- MinIO
- Self-hosted S3 implementations
- Services that don't support virtual-hosted style

## MinIO Setup

### Deploy MinIO

```yaml
services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
```

### Create Bucket

1. Open MinIO Console at `http://localhost:9001`
2. Login with root credentials
3. Create a bucket (e.g., `backups`)
4. Create access key for DBackup

### Configure DBackup

- **Endpoint**: `http://minio:9000` (if in same Docker network)
- **Region**: `us-east-1`
- **Bucket**: `backups`
- **Force Path Style**: `true` ✅

## DigitalOcean Spaces

### Create Space

1. Go to DigitalOcean Control Panel
2. Click "Spaces" → "Create Space"
3. Choose region and name

### Generate API Key

1. Go to API → Spaces Keys
2. Generate new key pair

### Configure DBackup

- **Endpoint**: `https://nyc3.digitaloceanspaces.com`
- **Region**: `nyc3` (match your Space region)
- **Bucket**: Your Space name
- **Force Path Style**: `false`

## Backblaze B2

### Create Bucket

1. Login to Backblaze Console
2. Go to Buckets → Create a Bucket
3. Note the bucket name

### Create Application Key

1. Go to App Keys
2. Create new key with read/write access

### Configure DBackup

- **Endpoint**: `https://s3.us-west-002.backblazeb2.com`
- **Region**: `us-west-002` (from your bucket details)
- **Bucket**: Your bucket name
- **Access Key ID**: Application Key ID
- **Secret Access Key**: Application Key
- **Force Path Style**: `false`

## Wasabi

### Configure DBackup

- **Endpoint**: `https://s3.wasabisys.com` (or regional)
- **Region**: `us-east-1` (or your region)
- **Bucket**: Your bucket name
- **Force Path Style**: `false`

Regional endpoints:
- US East: `s3.us-east-1.wasabisys.com`
- US West: `s3.us-west-1.wasabisys.com`
- EU: `s3.eu-central-1.wasabisys.com`

## Common Configuration Patterns

### Self-Hosted (Force Path Style)

```
Endpoint: http://minio.local:9000
Force Path Style: true
```

### Cloud Provider (Virtual-Hosted)

```
Endpoint: https://s3.region.provider.com
Force Path Style: false
```

## Troubleshooting

### Invalid Endpoint

```
getaddrinfo ENOTFOUND
```

**Solutions**:
1. Verify endpoint URL is correct
2. Include `https://` or `http://` prefix
3. Check DNS resolution
4. For Docker, use service name or IP

### SignatureDoesNotMatch

```
The request signature we calculated does not match
```

**Solutions**:
1. Verify access key and secret are correct
2. Check for leading/trailing spaces
3. Ensure region matches endpoint
4. Some providers require specific regions

### NoSuchBucket

```
The specified bucket does not exist
```

**Solutions**:
1. Verify bucket name (exact match)
2. Create bucket if it doesn't exist
3. Check bucket is in correct region

### AccessDenied

```
Access Denied
```

**Solutions**:
1. Verify access key has bucket permissions
2. Check bucket policy
3. Ensure bucket exists
4. Try enabling Force Path Style

### SSL Certificate Error

```
self signed certificate in certificate chain
```

**Solutions**:
1. Use valid SSL certificate
2. For development, add CA to trust store
3. Or use HTTP instead of HTTPS (not recommended)

## Performance Tuning

### Multipart Uploads

Large files are automatically uploaded in parts:
- Chunk size: 5MB-5GB per part
- Parallel uploads for speed

### Network Optimization

- Use endpoint in same region/datacenter
- Enable DBackup compression
- Consider dedicated network for backups

## Security

### Access Control

Most S3-compatible services support:
- IAM-style policies
- Bucket policies
- ACLs (Access Control Lists)

Create minimal permissions:
- `s3:PutObject` - Upload backups
- `s3:GetObject` - Download/restore
- `s3:DeleteObject` - Retention cleanup
- `s3:ListBucket` - Browse backups

### Encryption

Layers of encryption:
1. **Transfer**: TLS (HTTPS endpoint)
2. **Server-side**: Provider encryption
3. **Client-side**: DBackup Encryption Profiles

Enable all three for maximum security.

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Storage Explorer](/user-guide/features/storage-explorer)
