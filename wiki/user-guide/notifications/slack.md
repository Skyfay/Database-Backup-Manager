# Slack

Send formatted notifications to Slack channels using Incoming Webhooks. Slack notifications use the Block Kit framework for rich, structured messages.

## Overview

- 💬 **Block Kit Formatting** — Headers, sections, and structured field layouts
- 🎨 **Color-Coded Attachments** — Visual status indicators via colored sidebars
- 📌 **Channel Override** — Optionally route messages to a different channel
- 🤖 **Custom Bot Identity** — Set display name and icon emoji

## Configuration

| Field | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| **Webhook URL** | Slack Incoming Webhook URL | — | ✅ |
| **Channel** | Override channel (e.g., `#backups`) | Webhook default | ❌ |
| **Username** | Bot display name | `DBackup` | ❌ |
| **Icon Emoji** | Bot icon emoji (e.g., `:shield:`) | Default | ❌ |

## Setup Guide

### 1. Create a Slack App with Incoming Webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**
2. Choose **From scratch**, enter a name (e.g., "DBackup"), and select your workspace
3. In the left sidebar, click **Incoming Webhooks**
4. Toggle **Activate Incoming Webhooks** to **On**
5. Click **Add New Webhook to Workspace**
6. Select the channel where notifications should be sent
7. Click **Allow**
8. Copy the **Webhook URL** (starts with `https://hooks.slack.com/services/...`)

::: tip
You can add multiple webhooks for different channels within the same Slack app.
:::

### 2. Configure in DBackup

1. Go to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select **Slack Webhook**
4. Paste the webhook URL
5. (Optional) Set channel override, username, and icon emoji
6. Click **Test** to verify
7. Save

### 3. Test the Connection

Click **Test** to send a test notification. You should see a message appear in your Slack channel.

## Message Format

Slack notifications use Block Kit with color-coded attachments:

| Color | Meaning |
| :--- | :--- |
| 🟢 Green (`#00ff00`) | Success |
| 🔴 Red (`#ff0000`) | Failure |
| 🔵 Blue (`#3b82f6`) | Informational |

Each message includes:
- **Header Block** — Event title
- **Section Block** — Summary message text
- **Fields Block** — Structured key-value data (job name, duration, size, etc.)
- **Context Block** — Timestamp

## Channel Override

The **Channel** field lets you override the default channel configured in the webhook. This is useful when you want to use a single webhook to send to different channels:

- Leave empty to use the webhook's default channel
- Set to `#production-alerts` to route to a specific channel
- Set to `@username` to DM a specific user

::: warning
Channel override requires the Slack app to have the `chat:write` scope. The basic Incoming Webhook scope only sends to the configured channel.
:::

## Icon Emoji

Set a custom emoji as the bot's avatar:

| Value | Result |
| :--- | :--- |
| `:shield:` | 🛡️ Shield icon |
| `:floppy_disk:` | 💾 Floppy disk |
| `:white_check_mark:` | ✅ Checkmark |
| `:rotating_light:` | 🚨 Alarm light |

## Troubleshooting

### Invalid Webhook URL

```
Slack returned 403: invalid_token
```

**Solutions:**
1. Verify the webhook URL is complete
2. Check the Slack app hasn't been uninstalled
3. Regenerate the webhook in Slack App settings

### Channel Not Found

```
Slack returned 404: channel_not_found
```

**Solutions:**
1. Ensure the channel exists and is not archived
2. If using channel override, verify the channel name includes `#`
3. Invite the bot to private channels

### App Not Installed

```
Slack returned 403: team_disabled
```

**Solution:** Reinstall the Slack app in your workspace settings.

## Best Practices

1. **Create a dedicated Slack app** — Name it "DBackup" for easy identification
2. **Use a dedicated channel** — e.g., `#db-backups` or `#infra-alerts`
3. **Set a recognizable icon** — Use `:shield:` or `:floppy_disk:` for quick visual identification
4. **Don't share webhook URLs** — Treat them as secrets
5. **Use channel override sparingly** — Prefer creating separate webhooks per channel
