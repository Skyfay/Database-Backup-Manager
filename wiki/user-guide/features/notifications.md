# Notifications

Get alerts when backups complete or fail.

## Overview

DBackup can send notifications for backup events:
- ✅ Successful backups
- ❌ Failed backups
- ⚠️ Warnings

## Supported Channels

| Channel | Best For |
| :--- | :--- |
| [Discord](#discord) | Team notifications |
| [Email](#email) | Formal alerts |

## Discord

Send notifications to Discord channels via webhooks.

### Setup

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

### Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **Webhook URL** | Discord webhook URL | Required |
| **Username** | Bot display name | "Backup Manager" |
| **Avatar URL** | Bot avatar image | Default |

### Message Format

Discord notifications include:
- Job name
- Status (Success/Failed)
- Duration
- Backup size
- Database info
- Timestamp

Example:
```
✅ Backup Successful
─────────────────────
Job: Daily MySQL Backup
Duration: 45 seconds
Size: 125 MB
Databases: myapp, users
Time: 2024-01-15 02:00:00
```

## Email

Send notifications via SMTP.

### Setup

1. Go to **Notifications**
2. Click **Add Notification**
3. Select **Email (SMTP)**
4. Configure SMTP settings
5. Click **Test** to send test email
6. Save

### Configuration

| Field | Description | Default |
| :--- | :--- | :--- |
| **SMTP Host** | Mail server hostname | Required |
| **Port** | SMTP port | `587` |
| **Security** | None, SSL, or STARTTLS | `starttls` |
| **User** | SMTP username | Optional |
| **Password** | SMTP password | Optional |
| **From** | Sender email address | Required |
| **To** | Recipient email address | Required |

### Common SMTP Configurations

#### Gmail

```
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
User: your-email@gmail.com
Password: App Password (not regular password)
```

::: tip Gmail App Password
Generate at: Google Account → Security → 2-Step Verification → App passwords
:::

#### SendGrid

```
Host: smtp.sendgrid.net
Port: 587
Security: STARTTLS
User: apikey
Password: Your SendGrid API key
```

#### Mailgun

```
Host: smtp.mailgun.org
Port: 587
Security: STARTTLS
User: postmaster@your-domain.mailgun.org
Password: SMTP password from Mailgun
```

#### Self-Hosted (Postfix)

```
Host: mail.example.com
Port: 587
Security: STARTTLS
User: (if required)
Password: (if required)
```

### Email Format

HTML emails with:
- Clear status header
- Job details
- Execution summary
- Error messages (if failed)
- Quick links (optional)

## Assigning to Jobs

### Per-Job Notifications

1. Edit a backup job
2. Go to **Notifications** section
3. Select notification channel
4. Choose trigger condition:
   - **Always**: Both success and failure
   - **On Success**: Only when backup succeeds
   - **On Failure**: Only when backup fails

### Multiple Notifications

You can assign multiple notifications to one job:
- Discord for team awareness
- Email for formal records
- Different channels for success vs failure

## Notification Conditions

| Condition | When Triggered |
| :--- | :--- |
| **Always** | Every backup completion |
| **On Success** | Only successful backups |
| **On Failure** | Only failed backups |

### Recommended Setup

| Use Case | Condition |
| :--- | :--- |
| Critical production | Always |
| Development | On Failure only |
| Compliance | Always |
| Team awareness | On Failure |

## Testing Notifications

### Test Button

1. In notification settings, click **Test**
2. A test message is sent
3. Verify receipt
4. Check formatting

### Real Test

1. Create a simple backup job
2. Assign notification
3. Run the job
4. Verify notification received

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

## Best Practices

### Notification Strategy

1. **Always notify on failure** - Critical for reliability
2. **Consider noise** - Too many success notifications = ignored
3. **Use channels appropriately**:
   - Discord: Team visibility
   - Email: Audit trail
4. **Test regularly** - Ensure notifications work

### Failure Alerts

For critical backups:
1. Notify on every failure
2. Multiple channels (redundancy)
3. Include on-call contact
4. Document escalation process

### Security

1. **Don't log credentials** - Use environment variables
2. **Secure webhooks** - Don't share URLs publicly
3. **Review recipients** - Only needed parties
4. **SMTP over TLS** - Encrypt email transport

## Future Channels

Coming soon:
- Slack
- Microsoft Teams
- Custom webhooks
- PagerDuty
- SMS

## Next Steps

- [Creating Jobs](/user-guide/jobs/) - Assign notifications
- [Scheduling](/user-guide/jobs/scheduling) - Automate backups
- [Monitoring](/user-guide/features/storage-explorer) - Review backups
