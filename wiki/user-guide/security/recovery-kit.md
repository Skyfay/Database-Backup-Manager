# Recovery Kit

Emergency decryption tool for encrypted backups.

## Overview

A Recovery Kit is a standalone package that lets you decrypt backups **without access to DBackup**. It's essential for disaster recovery scenarios.

## What's Included

Each Recovery Kit contains:

```
recovery-kit/
├── README.md           # Instructions
├── decrypt.js          # Node.js decryption script
├── key.txt            # Your encryption key
└── metadata-sample.json # Example metadata format
```

## Why You Need It

### Disaster Scenarios

- DBackup server destroyed
- Database corrupted
- Lost access to application
- `ENCRYPTION_KEY` lost
- Need offline access

### Without Recovery Kit

❌ Cannot decrypt backups
❌ Data potentially lost forever
❌ No way to recover encryption key

### With Recovery Kit

✅ Decrypt backups anywhere
✅ Only need Node.js
✅ Works offline
✅ Independent of DBackup

## Downloading a Recovery Kit

1. Go to **Settings** → **Vault**
2. Click on an encryption profile
3. Click **Download Recovery Kit**
4. Save the zip file securely

::: danger Store Securely
The Recovery Kit contains your encryption key! Store it:
- In a password manager
- On encrypted storage
- In a secure physical location
- **NOT** in the same place as backups
:::

## Using the Recovery Kit

### Prerequisites

- Node.js 18+ installed
- Backup file (`.enc`)
- Corresponding `.meta.json` file

### Steps

1. Extract the Recovery Kit:
```bash
unzip recovery-kit-profile-name.zip
cd recovery-kit
```

2. Install dependencies (if needed):
```bash
npm install
```

3. Run the decryption:
```bash
node decrypt.js /path/to/backup.sql.gz.enc
```

4. Output file:
```
/path/to/backup.sql.gz  # Decrypted, still compressed
```

5. Decompress if needed:
```bash
# For Gzip
gunzip backup.sql.gz

# For Brotli
brotli -d backup.sql.br
```

### Script Usage

```bash
node decrypt.js <encrypted-file> [output-file]

# Examples:
node decrypt.js backup.sql.gz.enc
node decrypt.js backup.sql.gz.enc decrypted.sql.gz
```

## How It Works

### Decryption Process

```javascript
// 1. Read metadata
const meta = JSON.parse(fs.readFileSync(file + '.meta.json'));

// 2. Extract encryption parameters
const { iv, authTag, profileId } = meta.encryption;

// 3. Create decipher
const decipher = crypto.createDecipheriv(
  'aes-256-gcm',
  Buffer.from(KEY, 'hex'),
  Buffer.from(iv, 'hex')
);
decipher.setAuthTag(Buffer.from(authTag, 'hex'));

// 4. Decrypt file
fs.createReadStream(encryptedFile)
  .pipe(decipher)
  .pipe(fs.createWriteStream(outputFile));
```

### Required Metadata

The `.meta.json` file must contain:

```json
{
  "encryption": {
    "enabled": true,
    "iv": "hex-encoded-initialization-vector",
    "authTag": "hex-encoded-authentication-tag"
  },
  "compression": "GZIP"
}
```

## Best Practices

### Storage Recommendations

| Location | Security | Accessibility |
| :--- | :--- | :--- |
| Password Manager | ✅ High | ✅ Easy |
| Encrypted USB | ✅ High | ⚡ Medium |
| Bank Safe Deposit | ✅ Very High | ❌ Difficult |
| Printed (sealed) | ✅ High | ❌ Manual entry |

### Multiple Copies

Store Recovery Kit in:
1. Primary: Password manager (Bitwarden, 1Password)
2. Secondary: Encrypted USB at home
3. Tertiary: Sealed envelope at trusted location

### Test Regularly

1. Download fresh Recovery Kit quarterly
2. Test decryption with recent backup
3. Verify key matches current profile

### Update After Key Rotation

When creating new encryption profile:
1. Download new Recovery Kit
2. Update all storage locations
3. Keep old kit until old backups expire

## Troubleshooting

### "Invalid key length"

**Cause**: Key is not 64 hex characters

**Solution**: Verify key.txt contains exactly 64 characters

### "Unable to authenticate data"

**Cause**: Wrong key or corrupted file

**Solutions**:
1. Verify correct Recovery Kit for this backup
2. Check `.meta.json` matches the `.enc` file
3. Re-download backup file

### "Metadata file not found"

**Cause**: Missing `.meta.json`

**Solution**:
- Download both files from storage
- They must be in same directory

### "Unsupported Node.js version"

**Cause**: Old Node.js

**Solution**: Update to Node.js 18+

## Creating Custom Decryption

If you need to decrypt in another language:

### Python Example

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import json

# Read key
key = bytes.fromhex(open('key.txt').read().strip())

# Read metadata
meta = json.load(open('backup.sql.gz.enc.meta.json'))
iv = bytes.fromhex(meta['encryption']['iv'])
tag = bytes.fromhex(meta['encryption']['authTag'])

# Read encrypted data
encrypted = open('backup.sql.gz.enc', 'rb').read()

# Decrypt
aesgcm = AESGCM(key)
decrypted = aesgcm.decrypt(iv, encrypted + tag, None)

# Write output
open('backup.sql.gz', 'wb').write(decrypted)
```

### OpenSSL (Command Line)

```bash
# Note: OpenSSL GCM support varies
openssl enc -d -aes-256-gcm \
  -K $(cat key.txt) \
  -iv $(cat meta.json | jq -r '.encryption.iv') \
  -in backup.sql.gz.enc \
  -out backup.sql.gz
```

## Emergency Checklist

When you need to use Recovery Kit:

- [ ] Locate Recovery Kit
- [ ] Download backup files (.enc + .meta.json)
- [ ] Install Node.js if needed
- [ ] Extract Recovery Kit
- [ ] Run decrypt script
- [ ] Decompress if needed
- [ ] Verify SQL file is valid
- [ ] Restore to database

## Next Steps

- [Encryption Vault](/user-guide/security/encryption) - Manage encryption profiles
- [Restore](/user-guide/features/restore) - Normal restore process
- [System Backup](/user-guide/features/system-backup) - Backup DBackup itself
