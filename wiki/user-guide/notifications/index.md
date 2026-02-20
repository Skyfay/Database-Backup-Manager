# Notification Channels

DBackup supports multiple notification channels to keep you informed about backup status, system events, and user activity. Choose based on your team's communication platform and requirements.

## Supported Channels

| Channel | Type | Best For |
| :--- | :--- | :--- |
| [Discord](/user-guide/notifications/discord) | Webhook | Team chat, gaming communities, dev teams |
| [Slack](/user-guide/notifications/slack) | Webhook | Workplace communication, DevOps teams |
| [Microsoft Teams](/user-guide/notifications/teams) | Webhook | Enterprise environments, Microsoft 365 |
| [Generic Webhook](/user-guide/notifications/generic-webhook) | HTTP | Custom integrations (Ntfy, Gotify, PagerDuty, etc.) |
| [Email (SMTP)](/user-guide/notifications/email) | SMTP | Formal alerts, per-user notifications, audit trail |

## Choosing a Channel

### Discord

**Pros:**
- Quick setup (just a webhook URL)
- Rich embeds with colors and structured fields
- Great for small teams and dev communities

**Cons:**
- Not suitable for formal/enterprise notifications
- Webhook URLs can be leaked if not handled carefully

**Best for:** Development teams, home lab admins, small organizations.

### Slack

**Pros:**
- Industry-standard workplace messaging
- Block Kit for rich, interactive formatting
- Channel override for routing notifications

**Cons:**
- Requires Slack workspace access
- Webhook URLs tied to specific channels

**Best for:** DevOps teams, engineering organizations, startups.

### Microsoft Teams

**Pros:**
- Native Microsoft 365 integration
- Adaptive Cards for structured content
- Enterprise-grade compliance

**Cons:**
- Webhook setup requires Power Automate / Workflows
- More complex setup than Discord or Slack

**Best for:** Enterprise environments, Microsoft 365 organizations.

### Generic Webhook

**Pros:**
- Works with any HTTP endpoint
- Customizable payload templates
- Supports authentication headers

**Cons:**
- Requires endpoint setup on the receiving end
- No rich formatting (plain JSON)

**Best for:** Self-hosted notification services (Ntfy, Gotify), monitoring tools (PagerDuty, Uptime Kuma), custom integrations.

### Email (SMTP)

**Pros:**
- Universal — everyone has email
- HTML formatting with status colors
- Per-user delivery for login/account events
- Audit trail

**Cons:**
- Requires SMTP server access
- May land in spam if not configured properly

**Best for:** Formal alerts, compliance requirements, per-user notifications.

## Adding a Notification Channel

1. Navigate to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select the channel type from the adapter picker
4. Fill in the configuration details
5. Click **Test** to send a test notification
6. Save the configuration

## Two Notification Layers

DBackup has two independent notification systems that share the same channels:

| Layer | Configured In | Purpose |
| :--- | :--- | :--- |
| **Per-Job Notifications** | Job → Notifications tab | Alerts for individual backup jobs |
| **System Notifications** | Settings → Notifications | System-wide events (login, restore, errors) |

See [Notifications Feature Guide](/user-guide/features/notifications) for detailed configuration of per-job and system notifications.

## Next Steps

Choose your notification channel for detailed setup instructions:

- [Discord](/user-guide/notifications/discord) — Webhook-based rich embeds
- [Slack](/user-guide/notifications/slack) — Block Kit formatted messages
- [Microsoft Teams](/user-guide/notifications/teams) — Adaptive Card notifications
- [Generic Webhook](/user-guide/notifications/generic-webhook) — Custom JSON payloads
- [Email (SMTP)](/user-guide/notifications/email) — HTML email via SMTP
