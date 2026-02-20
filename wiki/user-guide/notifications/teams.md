# Microsoft Teams

Send Adaptive Card notifications to Microsoft Teams channels via Power Automate Workflows webhooks.

## Overview

- 🏢 **Enterprise Ready** — Native Microsoft 365 integration
- 🃏 **Adaptive Cards** — Structured content with FactSet layouts
- 🎨 **Color-Coded Status** — Visual status indicators on titles
- 📋 **Rich Field Layout** — Key-value pairs displayed as facts

## Configuration

| Field | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| **Webhook URL** | Teams Workflow webhook URL | — | ✅ |

## Setup Guide

### 1. Create an Incoming Webhook in Teams

Microsoft Teams uses **Power Automate Workflows** for incoming webhooks (the legacy Office 365 Connector method is deprecated).

#### Using Workflows (Recommended)

1. Open the target **Teams channel**
2. Click the **⋯ (More options)** menu on the channel
3. Select **Workflows**
4. Search for **"Post to a channel when a webhook request is received"**
5. Click the template and follow the setup wizard
6. Name the workflow (e.g., "DBackup Notifications")
7. Select the target team and channel
8. Click **Add workflow**
9. Copy the generated **webhook URL**

::: warning URL Format
The webhook URL should look like:
```
https://prod-XX.westeurope.logic.azure.com:443/workflows/...
```
or
```
https://TENANT.webhook.office.com/webhookb2/...
```
Do not confuse this with the deprecated Office 365 Connector URL format.
:::

### 2. Configure in DBackup

1. Go to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select **Microsoft Teams**
4. Paste the webhook URL
5. Click **Test** to verify
6. Save

### 3. Test the Connection

Click **Test** to send a test notification. You should see an Adaptive Card appear in your Teams channel within a few seconds.

## Message Format

Teams notifications use Adaptive Cards v1.4 with the following structure:

| Element | Content |
| :--- | :--- |
| **Title** | Event name with status color (Attention/Good/Warning) |
| **Body** | Summary message text |
| **FactSet** | Structured key-value pairs (job name, duration, size, etc.) |
| **Footer** | ISO 8601 timestamp |

### Color Mapping

Since Adaptive Cards only support named colors, DBackup maps hex colors to the closest Adaptive Card color:

| Status | Adaptive Card Color | Appears As |
| :--- | :--- | :--- |
| Success | `Good` | Green text |
| Failure | `Attention` | Red text |
| Warning | `Warning` | Yellow text |
| Informational | `Accent` | Blue text |
| Other | `Default` | Theme default |

## Multiple Channels

Create separate webhooks and notification channels for different purposes:
- **#production-alerts** — Critical backup notifications
- **#infrastructure** — System events and restore notifications
- **#dev-notifications** — Development environment backups

## Troubleshooting

### Webhook Returns 400

```
Teams returned 400: Bad Request
```

**Solutions:**
1. Verify the webhook URL is from a Power Automate Workflow, not a deprecated Office 365 Connector
2. Ensure the workflow is still active and not disabled
3. Check if the Teams channel still exists

### Webhook Returns 401/403

```
Teams returned 401: Unauthorized
```

**Solutions:**
1. The workflow may have expired — recreate it
2. Check if the user who created the workflow still has access to the channel
3. Verify the workflow hasn't been disabled by an admin

### Card Not Rendering

If the notification arrives but appears as raw JSON:
1. Ensure the workflow template is "Post to a channel when a webhook request is received"
2. The workflow must be configured to accept Adaptive Card payloads
3. Try recreating the workflow with the recommended template

### Workflow Not Triggering

**Solutions:**
1. Check the Power Automate portal for workflow errors
2. Verify the workflow is turned on
3. Check if you've hit the Power Automate connector limits for your plan

## Best Practices

1. **Use Power Automate Workflows** — The legacy Office 365 Connector method is deprecated by Microsoft
2. **Label workflows clearly** — Name them "DBackup - Production" etc. for easy management
3. **Monitor workflow health** — Check Power Automate portal periodically for failures
4. **Separate channels by criticality** — Production vs. development notifications
5. **Document the webhook creator** — Workflows are tied to the creating user's account
