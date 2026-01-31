# Compression

Reduce backup file sizes with Gzip or Brotli compression.

## Overview

Compression significantly reduces:
- **Storage costs** - Smaller files = less storage
- **Transfer time** - Less data to upload
- **Network bandwidth** - Lower bandwidth usage

Typical compression ratios for SQL dumps:

| Content Type | Compression Ratio |
| :--- | :--- |
| SQL dumps (text) | 60-80% smaller |
| Binary data (BLOBs) | 10-30% smaller |
| Already compressed | 0-5% smaller |

## Compression Algorithms

### Gzip

**Best for**: General use, fast compression

| Aspect | Rating |
| :--- | :--- |
| Speed | ⭐⭐⭐⭐⭐ Fast |
| Compression | ⭐⭐⭐ Good |
| CPU Usage | Low |
| Compatibility | Universal |

### Brotli

**Best for**: Maximum compression, slower systems acceptable

| Aspect | Rating |
| :--- | :--- |
| Speed | ⭐⭐⭐ Moderate |
| Compression | ⭐⭐⭐⭐⭐ Excellent |
| CPU Usage | Medium |
| Compatibility | Modern |

### Comparison

100MB SQL dump:

| Algorithm | Compressed Size | Time |
| :--- | :--- | :--- |
| None | 100 MB | 0s |
| Gzip | 25 MB (75% reduction) | ~5s |
| Brotli | 20 MB (80% reduction) | ~15s |

## Enabling Compression

### On Job Creation

1. Create or edit a backup job
2. In **Processing** section, enable **Compression**
3. Select algorithm: **Gzip** or **Brotli**
4. Save

### File Extensions

Compressed backups have extensions:
- Gzip: `backup.sql.gz`
- Brotli: `backup.sql.br`

With encryption:
- `backup.sql.gz.enc`
- `backup.sql.br.enc`

## Pipeline Order

Compression happens **before** encryption:

```
Database → Dump → Compress → Encrypt → Upload
                     ↑          ↑
                   Gzip/Brotli  AES-256
```

This order is optimal because:
1. Encrypted data doesn't compress well
2. Compression works best on text data
3. Smaller encrypted file to upload

## Streaming Architecture

DBackup uses **streaming compression**:

```javascript
dumpStream
  .pipe(compressionStream)
  .pipe(encryptionStream)
  .pipe(uploadStream)
```

Benefits:
- **Low memory**: Doesn't load entire file
- **Fast**: Parallel processing
- **Scalable**: Works with any size database

## When to Use

### Use Gzip When

- Backup speed is critical
- CPU resources are limited
- Compatibility is important
- Good balance needed

### Use Brotli When

- Storage costs are high
- Maximum compression wanted
- Time is not critical
- Modern systems only

### Skip Compression When

- Database contains mostly binary BLOBs
- Network is faster than compression time
- Immediate backups needed

## Storage Savings

### Example: 1GB Database

| Setup | Size | Monthly Cost* |
| :--- | :--- | :--- |
| No compression | 30 GB (30 daily) | $0.69 |
| Gzip | 7.5 GB | $0.17 |
| Brotli | 6 GB | $0.14 |

*S3 Standard pricing ($0.023/GB)

### Yearly Savings

For 10 databases with Smart retention:
- No compression: ~300 GB = $83/year
- With Gzip: ~75 GB = $21/year
- **Savings: $62/year per 10 databases**

## Restore and Download

### Automatic Decompression

When restoring or downloading:
1. DBackup reads metadata
2. Detects compression algorithm
3. Decompresses automatically

### Manual Decompression

If needed outside DBackup:

```bash
# Gzip
gunzip backup.sql.gz

# Brotli
brotli -d backup.sql.br
```

## Performance Tuning

### CPU Considerations

Compression uses CPU. Monitor during backups:
- High CPU: Consider Gzip over Brotli
- Multiple jobs: Stagger schedules

### Memory Usage

Streaming keeps memory low, but:
- Brotli uses more memory than Gzip
- Large databases may need more resources

### Disk I/O

Compression reduces disk writes:
- Smaller temp files
- Faster uploads
- Less disk wear

## Metadata Storage

Compression info stored in `.meta.json`:

```json
{
  "compression": "GZIP",
  "encryption": {
    "enabled": false
  },
  "originalSize": 104857600,
  "compressedSize": 26214400
}
```

## Troubleshooting

### Compression Slow

**Causes**:
- Large database
- Brotli algorithm
- CPU constraints

**Solutions**:
1. Switch to Gzip
2. Schedule during low-usage
3. Check CPU availability

### Decompression Fails

**Causes**:
- Corrupted file
- Wrong algorithm detected
- Incomplete download

**Solutions**:
1. Re-download from storage
2. Check `.meta.json` for correct algorithm
3. Verify file integrity

### File Larger After Compression

**Cause**: Already compressed data (images, PDFs)

**Solution**:
1. Consider skipping compression
2. Or accept minimal overhead

## Best Practices

1. **Start with Gzip** - Good balance for most cases
2. **Monitor backup times** - Switch if too slow
3. **Compare sizes** - Test both algorithms
4. **Enable for all jobs** - Storage savings add up
5. **Combine with encryption** - Compress then encrypt
6. **Test restores** - Verify decompression works

## Next Steps

- [Encryption](/user-guide/security/encryption) - Encrypt compressed backups
- [Creating Jobs](/user-guide/jobs/) - Configure compression
- [Storage Explorer](/user-guide/features/storage-explorer) - View backup sizes
