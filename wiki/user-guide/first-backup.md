# Your First Backup

This tutorial walks you through creating your first automated backup job step by step.

## Overview

A backup job in DBackup connects three things:

1. **Source** - The database to backup
2. **Destination** - Where to store the backup
3. **Schedule** - When to run the backup (optional)

Let's set up all three.

## Step 1: Add a Storage Destination

First, create a place to store your backups.

### Using Local Filesystem

1. Go to **Destinations** in the sidebar
2. Click **Add Destination**
3. Select **Local Filesystem**
4. Configure:
   - **Name**: `Local Backups`
   - **Base Path**: `/backups`
5. Click **Test Connection**
6. Click **Save**

::: tip Docker Volume
When using Docker, `/backups` maps to your host's `./backups` folder via volume mount.
:::

## Step 2: Add a Database Source

Now add the database you want to backup.

### Example: MySQL Database

1. Go to **Sources** in the sidebar
2. Click **Add Source**
3. Select **MySQL**
4. Configure:
   - **Name**: `Production MySQL`
   - **Host**: `mysql.example.com` (or `host.docker.internal` for host machine)
   - **Port**: `3306`
   - **User**: `backup_user`
   - **Password**: `your-password`
5. Click **Test Connection**

### Select Databases

After successful connection test:

1. Click **Fetch Databases** to list available databases
2. Select which databases to include in backups
3. Click **Save**

::: warning Permissions
Ensure your database user has `SELECT` and `LOCK TABLES` permissions for backup, and `CREATE` permission for restore operations.
:::

## Step 3: Create a Backup Job

Now connect source and destination in a job.

1. Go to **Jobs** in the sidebar
2. Click **Create Job**
3. Configure:
   - **Name**: `Daily MySQL Backup`
   - **Source**: Select "Production MySQL"
   - **Destination**: Select "Local Backups"

### Optional: Add Compression

Reduce backup size significantly:

1. Enable **Compression**
2. Select algorithm:
   - **Gzip**: Good balance of speed and compression
   - **Brotli**: Better compression, slightly slower

### Optional: Add Encryption

Secure your backups:

1. First create an Encryption Profile in **Settings > Vault**
2. Back in job settings, enable **Encryption**
3. Select your encryption profile

### Optional: Set Schedule

Automate your backup:

1. Enable **Schedule**
2. Enter a cron expression or use the helper:
   - `0 2 * * *` - Daily at 2:00 AM
   - `0 */6 * * *` - Every 6 hours
   - `0 2 * * 0` - Weekly on Sunday at 2:00 AM

### Optional: Configure Retention

Automatically clean up old backups:

1. Enable **Retention Policy**
2. Choose mode:
   - **Simple**: Keep last N backups
   - **Smart (GVS)**: Grandfather-Father-Son rotation

3. Click **Save**

## Step 4: Run Your First Backup

Time to test!

1. On the Jobs page, find your new job
2. Click the **▶ Run Now** button
3. Watch the live progress

### Monitor Progress

The execution view shows:

- **Current step** (Initialize → Dump → Upload → Complete)
- **Progress bar** with file size
- **Live logs** of the operation

### View Results

After completion:

1. Check **History** for execution details
2. Browse **Storage Explorer** to see your backup file
3. Verify the `.meta.json` sidecar file was created

## Step 5: Set Up Notifications (Optional)

Get alerted when backups complete or fail.

### Discord Webhook

1. Go to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select **Discord Webhook**
4. Paste your webhook URL
5. Click **Test** to verify
6. Save

### Assign to Job

1. Edit your backup job
2. In the **Notifications** section, select your Discord notification
3. Choose when to notify:
   - On success only
   - On failure only
   - Always
4. Save

## Next Steps

Congratulations! You've created your first automated backup. Now explore:

- [Encryption Vault](/user-guide/security/encryption) - Secure your backups
- [Retention Policies](/user-guide/jobs/retention) - Automatic cleanup
- [Storage Explorer](/user-guide/features/storage-explorer) - Browse and manage backups
- [Restore](/user-guide/features/restore) - Restore from backups
