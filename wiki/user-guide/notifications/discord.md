# Discord

Send rich embed notifications to Discord channels via webhooks. Discord is the easiest notification channel to set up — just create a webhook and paste the URL.

## Overview

- 🎨 **Rich Embeds** — Color-coded status indicators with structured fields
- ⚡ **Instant Delivery** — Real-time notifications via Discord's webhook API
- 🔧 **Customizable** — Set bot username and avatar per notification channel
- 📱 **Cross-Platform** — Desktop, mobile, and web notifications via Discord

## Configuration

| Field | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| **Webhook URL** | Discord webhook URL | — | ✅ |
| **Username** | Bot display name in Discord | `Backup Manager` | ❌ |
| **Avatar URL** | Bot avatar image URL | Discord default | ❌ |

## Setup Guide

### 1. Create a Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations**
3. Click **Webhooks** → **New Webhook**
4. Choose the target channel
5. (Optional) Set a custom name and avatar
6. Click **Copy Webhook URL**

::: tip Dedicated Channel
Create a dedicated `#backups` or `#alerts` channel to keep notifications organized and avoid noise in general channels.
:::

### 2. Configure in DBackup

1. Go to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select **Discord Webhook**
4. Paste the webhook URL
5. (Optional) Set a custom username and avatar URL
6. Click **Test** to verify
7. Save

### 3. Test the Connection

Click **Test** to send a test notification. You should see a message appear in your Discord channel within seconds.

## Message Format

Discord notifications use rich embeds with colored sidebars:

| Color | Meaning | Events |
| :--- | :--- | :--- |
| 🟢 Green | Success | Backup complete, restore finished, user created |
| 🔴 Red | Failure | Backup failed, restore failed, system error |
| 🔵 Blue | Informational | User login |
| 🟣 Purple | System | Config backup |

Each embed includes:
- **Title** — Event type (e.g., "Backup Successful")
- **Description** — Summary message
- **Fields** — Structured key-value data (job name, duration, size, etc.)
- **Timestamp** — When the event occurred

## Multiple Webhooks

You can create multiple Discord notification channels pointing to different webhooks. For example:
- `#production-backups` — Critical production job alerts
- `#dev-backups` — Development environment notifications
- `#system-alerts` — Login, restore, and error events

## Troubleshooting

### Invalid Webhook Token

```
Discord returned 401: Invalid Webhook Token
```

**Solutions:**
1. Verify the webhook URL is complete and correct
2. Check the webhook hasn't been deleted in Discord
3. Regenerate the webhook in Server Settings → Integrations

### Rate Limited

```
Discord returned 429: You are being rate limited
```

**Cause:** Too many messages sent in a short period. Discord limits webhook requests.

**Solution:** Reduce notification frequency. Avoid setting every job to "Always" notify if you run many jobs per minute.

### Webhook Not Found

```
Discord returned 404: Unknown Webhook
```

**Solutions:**
1. The webhook may have been deleted
2. The channel may have been deleted
3. Create a new webhook and update the configuration

## Best Practices

1. **Use dedicated channels** — Don't spam general channels
2. **Set meaningful usernames** — Use names like "DBackup Production" to identify the source
3. **Notify on failure for most jobs** — Reduces noise
4. **Use "Always" for critical production** — Never miss a backup result
5. **Protect webhook URLs** — Treat them like passwords
