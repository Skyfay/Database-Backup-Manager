# Notifications

Get alerts when backups complete, users log in, restores finish, and more.

## Overview

DBackup has **two notification layers** that work together:

| Layer | Configured In | Purpose |
| :--- | :--- | :--- |
| **Per-Job Notifications** | Job → Notifications tab | Alerts for an individual backup job (success/failure) |
| **System Notifications** | Settings → Notifications | Global alerts for system-wide events (login, restore, errors, etc.) |

Both layers share the same notification channels (Email, Discord) that you configure under **Notifications** in the main menu.

## Supported Channels

| Channel | Best For |
| :--- | :--- |
| [Discord](#discord) | Team notifications via webhooks |
| [Email](#email-smtp) | Formal alerts, per-user notifications |

---

## Channel Setup

### Discord

Send notifications to Discord channels via webhooks.

#### Setup

1. In Discord, go to **Server Settings** → **Integrations**
2. Click **Create Webhook**
3. Choose channel and copy webhook URL
4. In DBackup, go to **Notifications**
5. Click **Add Notification**
6. Select **Discord Webhook**
7. Paste the webhook URL
8. Configure name and avatar (optional)
9. Click **Test** to verify
10. Save

#### Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Webhook URL** | Discord webhook URL | Required |
| **Username** | Bot display name | "Backup Manager" |
| **Avatar URL** | Bot avatar image | Default |

#### Message Format

Discord notifications are displayed as rich embeds with colored sidebars:
- **Green** – Success (backup complete, restore finished, user created)
- **Red** – Failure (backup failed, restore failed, system error)
- **Blue** – Informational (user login)
- **Purple** – System events (config backup)

Each embed includes structured fields (job name, duration, size, etc.).

### Email (SMTP)

Send HTML notifications via any SMTP server.

#### Setup

1. Go to **Notifications**
2. Click **Add Notification**
3. Select **Email (SMTP)**
4. Configure SMTP settings
5. Click **Test** to send test email
6. Save

#### Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **SMTP Host** | Mail server hostname | Required |
| **Port** | SMTP port | `587` |
| **Security** | None, SSL, or STARTTLS | `starttls` |
| **User** | SMTP username | Optional |
| **Password** | SMTP password | Optional |
| **From** | Sender email address | Required |
| **To** | Recipient email address | Required |

#### Common SMTP Configurations

::: details Gmail
```
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
User: your-email@gmail.com
Password: App Password (not regular password)
```
Generate an App Password at: Google Account → Security → 2-Step Verification → App passwords
:::

::: details SendGrid
```
Host: smtp.sendgrid.net
Port: 587
Security: STARTTLS
User: apikey
Password: Your SendGrid API key
```
:::

::: details Mailgun
```
Host: smtp.mailgun.org
Port: 587
Security: STARTTLS
User: postmaster@your-domain.mailgun.org
Password: SMTP password from Mailgun
```
:::

::: details Self-Hosted (Postfix)
```
Host: mail.example.com
Port: 587
Security: STARTTLS
User: (if required)
Password: (if required)
```
:::

#### Email Format

HTML emails with a colored status bar, structured detail fields, and timestamp. The template is consistent across all notification types.

---

## Per-Job Notifications

Per-job notifications alert you when a specific backup job completes or fails.

### Assigning to a Job

1. Edit a backup job
2. Go to the **Notifications** section
3. Select a notification channel
4. Choose the trigger condition:
   - **Always** – Both success and failure
   - **On Success** – Only when the backup succeeds
   - **On Failure** – Only when the backup fails

### Multiple Channels

You can assign multiple notifications to one job — for example Discord for quick team awareness and Email for formal audit records.

### Notification Conditions

| Condition | When Triggered |
| :--- | :--- |
| **Always** | Every backup completion |
| **On Success** | Only successful backups |
| **On Failure** | Only failed backups |

::: tip Recommended Setup
| Use Case | Condition |
| :--- | :--- |
| Critical production | Always |
| Development | On Failure only |
| Compliance | Always |
| Team awareness | On Failure |
:::

---

## System Notifications

System notifications cover events beyond individual backup jobs: user activity, restores, configuration backups, and system errors.

### Setup

1. Go to **Settings** → **Notifications** tab
2. **Select global channels** – Choose which notification channels receive system alerts by default
3. **Enable events** – Toggle individual events on or off
4. Optionally override channels per event

### Available Events

#### Authentication Events

| Event | Description | Default |
| :--- | :--- | :--- |
| **User Login** | A user logged into the application | Disabled |
| **User Created** | A new user account was created | Disabled |

#### Restore Events

| Event | Description | Default |
| :--- | :--- | :--- |
| **Restore Completed** | A database restore completed successfully | Enabled |
| **Restore Failed** | A database restore failed | Enabled |

#### System Events

| Event | Description | Default |
| :--- | :--- | :--- |
| **Configuration Backup** | System configuration backup was created | Disabled |
| **System Error** | A critical system error occurred | Enabled |

::: info Why no backup events?
Backup success/failure notifications are configured **per-job** (Job → Notifications tab) and are not duplicated in system notifications. This prevents double notifications.
:::

### Global vs. Per-Event Channels

- **Global Channels**: The default channels used for all events that don't have an explicit override.
- **Per-Event Override**: Click the channel button on an event to assign custom channels. A "Custom Channels" badge appears. Click "Reset to Global Channels" to undo.

### Notify User Directly

For **User Login** and **User Created** events, you can optionally send an email directly to the affected user (e.g., a login notification to the user who logged in, or a welcome email to the newly created user).

::: warning Email Channel Required
This feature only works with Email (SMTP) channels. At least one Email channel must be selected for the event.
:::

#### Modes

| Mode | Behavior |
| :--- | :--- |
| **Disabled** | Notification goes only to the configured admin channels |
| **Admin & User** | Notification goes to admin channels AND a direct email to the user |
| **User only** | Notification goes ONLY to the user's email (admin channels are skipped) |

#### How to Configure

1. Go to **Settings** → **Notifications**
2. Enable **User Login** or **User Created**
3. Ensure at least one Email channel is selected
4. A **"Notify user directly"** dropdown appears below the channel selector
5. Choose the desired mode

The user's email address is taken from their account profile — no additional configuration needed.

### Test Notifications

Each event has a **Test** button that sends a sample notification through all selected channels using dummy data. Use this to verify your setup before relying on it.

---

## Troubleshooting

### Discord: Invalid Webhook

```
Invalid Webhook Token
```

**Solutions**:
1. Check webhook URL is complete
2. Verify webhook wasn't deleted
3. Regenerate webhook in Discord

### Discord: Rate Limited

```
You are being rate limited
```

**Cause**: Too many messages sent quickly

**Solution**: Reduce notification frequency

### Email: Connection Refused

```
Connection refused to smtp server
```

**Solutions**:
1. Verify host and port
2. Check firewall allows outbound
3. Verify SMTP server is running

### Email: Authentication Failed

```
Invalid login credentials
```

**Solutions**:
1. Check username/password
2. Use app password for Gmail
3. Verify security setting matches server

### Email: Not Received

**Check**:
1. Spam folder
2. Correct "To" address
3. SMTP logs for delivery status
4. Domain reputation

---

## Best Practices

### Notification Strategy

1. **Always notify on failure** – Critical for reliability
2. **Consider noise** – Too many success notifications get ignored
3. **Use channels appropriately**:
   - Discord: Team visibility
   - Email: Audit trail, per-user alerts
4. **Test regularly** – Ensure notifications work

### Security

1. **Don't log credentials** – Use environment variables
2. **Secure webhooks** – Don't share URLs publicly
3. **Review recipients** – Only needed parties
4. **SMTP over TLS** – Encrypt email transport

## Next Steps

- [Creating Jobs](/user-guide/jobs/) – Assign per-job notifications
- [Scheduling](/user-guide/jobs/scheduling) – Automate backups
- [Storage Explorer](/user-guide/features/storage-explorer) – Review backups
