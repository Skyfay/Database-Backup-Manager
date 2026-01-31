# Amazon S3

Store backups in Amazon Web Services S3 buckets.

## Overview

Amazon S3 provides highly durable object storage with 99.999999999% (11 nines) durability. Features include:

- Multiple storage classes (Standard, IA, Glacier)
- Server-side encryption
- Versioning and lifecycle policies
- Global infrastructure

## Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Name** | Friendly name for this destination | Required |
| **Region** | AWS region (e.g., `us-east-1`) | Required |
| **Bucket** | S3 bucket name | Required |
| **Access Key ID** | IAM access key | Required |
| **Secret Access Key** | IAM secret key | Required |
| **Path Prefix** | Folder within bucket | Optional |
| **Storage Class** | S3 storage class | `STANDARD` |

### Storage Classes

| Class | Use Case | Cost |
| :--- | :--- | :--- |
| `STANDARD` | Frequent access | $$$$ |
| `STANDARD_IA` | Infrequent access | $$$ |
| `GLACIER` | Archive (hours to retrieve) | $$ |
| `DEEP_ARCHIVE` | Long-term archive (12h+ retrieve) | $ |

## AWS Setup

### Create S3 Bucket

```bash
aws s3 mb s3://my-backup-bucket --region us-east-1
```

Or via AWS Console:
1. Go to S3 service
2. Click "Create bucket"
3. Choose region
4. Configure settings (versioning recommended)

### Create IAM User

1. Go to IAM Console
2. Create new user with programmatic access
3. Attach policy (see below)
4. Save access key and secret

### IAM Policy

Minimal permissions for DBackup:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-backup-bucket",
        "arn:aws:s3:::my-backup-bucket/*"
      ]
    }
  ]
}
```

For specific path prefix:
```json
"Resource": [
  "arn:aws:s3:::my-backup-bucket",
  "arn:aws:s3:::my-backup-bucket/backups/*"
]
```

## Bucket Configuration

### Enable Versioning (Recommended)

Protects against accidental deletion:

```bash
aws s3api put-bucket-versioning \
  --bucket my-backup-bucket \
  --versioning-configuration Status=Enabled
```

### Server-Side Encryption

Enable default encryption:

```bash
aws s3api put-bucket-encryption \
  --bucket my-backup-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Lifecycle Policy

Auto-transition to cheaper storage:

```json
{
  "Rules": [{
    "ID": "TransitionToGlacier",
    "Status": "Enabled",
    "Filter": {"Prefix": "backups/"},
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER"}
    ]
  }]
}
```

## Cost Optimization

### Use Appropriate Storage Class

- **STANDARD**: Backups needed for quick restore
- **STANDARD_IA**: Older backups (30+ days)
- **GLACIER**: Archives you rarely need

### Enable DBackup Retention

Let DBackup manage retention instead of S3 lifecycle:
- More control over which backups to keep
- Works with GVS (Grandfather-Father-Son) policy
- Locked backups are protected

### Reduce Egress Costs

- Use S3 in same region as your servers
- Enable DBackup compression to reduce size
- Consider Cloudflare R2 for zero egress

## Regional Considerations

### Data Residency

Choose region based on:
- Compliance requirements (GDPR → EU regions)
- Proximity to your servers
- Cost variations between regions

### Multi-Region

For disaster recovery:
1. Enable S3 Cross-Region Replication
2. Or create multiple DBackup destinations in different regions

## Troubleshooting

### Access Denied

```
Access Denied
```

**Solutions**:
1. Verify IAM policy includes required actions
2. Check bucket policy doesn't deny access
3. Verify access key is active
4. Check region matches bucket location

### Bucket Not Found

```
The specified bucket does not exist
```

**Solutions**:
1. Verify bucket name (case-sensitive)
2. Check region is correct
3. Bucket might be in different AWS account

### Invalid Credentials

```
The AWS Access Key Id you provided does not exist
```

**Solutions**:
1. Regenerate access key in IAM Console
2. Check for leading/trailing spaces
3. Verify access key is active (not disabled)

### Slow Uploads

**Solutions**:
1. Enable compression in job settings
2. Use multipart uploads (automatic for large files)
3. Consider using Transfer Acceleration

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible
2. **Enable MFA Delete** for critical buckets
3. **Block public access** on bucket
4. **Enable versioning** for recovery
5. **Use DBackup encryption** in addition to S3 encryption
6. **Rotate access keys** regularly
7. **Monitor with CloudTrail** for access auditing

## Integration with AWS Services

### CloudWatch Alarms

Monitor backup storage:
- Bucket size metrics
- Request count
- Error rates

### AWS Backup

DBackup can complement AWS Backup:
- DBackup: Application-level logical backups
- AWS Backup: Infrastructure-level snapshots

## Next Steps

- [Enable Encryption](/user-guide/security/encryption)
- [Configure Retention](/user-guide/jobs/retention)
- [Storage Explorer](/user-guide/features/storage-explorer)
