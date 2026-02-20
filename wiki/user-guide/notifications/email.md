# Email (SMTP)

Send HTML notifications via any SMTP server. Email supports multi-recipient delivery and per-user notifications for login and account events.

## Overview

- 📧 **Universal** — Works with any SMTP server
- 🎨 **HTML Templates** — Color-coded status bar with structured fields
- 👥 **Multiple Recipients** — Send to one or more email addresses
- 🔒 **Secure Transport** — SSL, STARTTLS, or plain connections
- 👤 **Per-User Delivery** — Direct emails to affected users for auth events

## Configuration

| Field | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| **SMTP Host** | Mail server hostname | — | ✅ |
| **Port** | SMTP port | `587` | ❌ |
| **Security** | None, SSL, or STARTTLS | `starttls` | ❌ |
| **User** | SMTP username | — | ❌ |
| **Password** | SMTP password | — | ❌ |
| **From** | Sender email address | — | ✅ |
| **To** | Recipient email address(es) | — | ✅ |

## Setup Guide

### 1. Gather SMTP Details

You'll need the following from your email provider:

- SMTP server hostname and port
- Authentication credentials (if required)
- Security method (SSL, STARTTLS, or none)

### 2. Configure in DBackup

1. Go to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select **Email (SMTP)**
4. Fill in the SMTP connection details
5. Set the sender (From) and recipient (To) addresses
6. Click **Test** to send a test email
7. Save

### 3. Test the Connection

Click **Test** to verify the SMTP connection and send a test email. Check the recipient's inbox (and spam folder) for the test message.

## Common SMTP Configurations

::: details Gmail
```
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
User: your-email@gmail.com
Password: App Password (not regular password)
```
Generate an App Password at: Google Account → Security → 2-Step Verification → App passwords

::: warning Gmail App Passwords
Regular passwords won't work with Gmail SMTP. You must create an App Password, which requires 2-Step Verification to be enabled.
:::

::: details SendGrid
```
Host: smtp.sendgrid.net
Port: 587
Security: STARTTLS
User: apikey
Password: Your SendGrid API key (SG.xxx)
```
:::

::: details Mailgun
```
Host: smtp.mailgun.org
Port: 587
Security: STARTTLS
User: postmaster@your-domain.mailgun.org
Password: SMTP password from Mailgun dashboard
```
:::

::: details Amazon SES
```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
Security: STARTTLS
User: SMTP username (from SES console)
Password: SMTP password (from SES console)
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

::: details Mailtrap (Testing)
```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Security: STARTTLS
User: Your Mailtrap username
Password: Your Mailtrap password
```
:::

## Email Format

HTML emails include:
- **Colored Header Bar** — Green for success, red for failure, blue for info
- **Title** — Event type (used as email subject: `[DBackup] Backup Successful`)
- **Message Body** — Summary text
- **Fields Table** — Structured key-value data (job name, duration, size, etc.)
- **Footer** — Timestamp

The same template is used for all notification types (backup, restore, login, system events).

## Multiple Recipients

The **To** field supports multiple email addresses. Add recipients as tags — each email is validated individually.

## Per-User Notifications

For **User Login** and **User Created** events, DBackup can send an email directly to the affected user (e.g., a login notification to the user who just logged in).

This is configured in **Settings → Notifications** (not in the notification channel itself). See [System Notifications](/user-guide/features/notifications#notify-user-directly) for details.

## Security Settings

| Setting | Port | Description |
| :--- | :--- | :--- |
| **None** | 25 | Unencrypted (not recommended) |
| **SSL** | 465 | Implicit TLS — encrypted from start |
| **STARTTLS** | 587 | Upgrade to TLS after connecting (recommended) |

::: warning
Always use **SSL** or **STARTTLS** in production to encrypt email credentials and content during transport.
:::

## Troubleshooting

### Connection Refused

```
Connection refused to smtp server
```

**Solutions:**
1. Verify the SMTP host and port are correct
2. Check firewall allows outbound connections on the SMTP port
3. Verify the SMTP server is running and accepting connections
4. If running in Docker, ensure the container can reach the mail server

### Authentication Failed

```
Invalid login credentials
```

**Solutions:**
1. Double-check username and password
2. For Gmail, use an App Password (not your regular password)
3. Verify the security setting matches what the server expects
4. Some providers require enabling "Less secure apps" or SMTP access

### Email Not Received

**Check:**
1. Spam/junk folder
2. Correct "To" address
3. Sender domain reputation
4. SMTP server logs for delivery status
5. SPF/DKIM/DMARC records for the sender domain

### Timeout

```
Connection timed out
```

**Solutions:**
1. Verify the port is correct (common mistake: using 25 instead of 587)
2. Check if the SMTP server is behind a firewall
3. Try a different security setting
4. Increase timeout if the server is slow

## Best Practices

1. **Use STARTTLS or SSL** — Never send credentials unencrypted
2. **Set a proper From address** — Use a recognizable sender like `dbackup@example.com`
3. **Configure SPF/DKIM** — Prevents emails from landing in spam
4. **Use App Passwords** — For Gmail and other providers that support them
5. **Test regularly** — SMTP credentials can expire or be rotated
6. **Don't use personal email** — Set up a dedicated service account
