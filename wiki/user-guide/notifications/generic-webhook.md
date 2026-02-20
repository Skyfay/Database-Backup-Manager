# Generic Webhook

Send JSON payloads to any HTTP endpoint. This adapter is designed for custom integrations with services like Ntfy, Gotify, PagerDuty, Uptime Kuma, and any other service that accepts HTTP requests.

## Overview

- 🌐 **Universal** — Works with any HTTP endpoint that accepts JSON
- 📝 **Custom Templates** — Define your own payload structure with `{{variable}}` placeholders
- 🔑 **Authentication** — Support for Authorization headers (Bearer tokens, API keys)
- ⚙️ **Flexible** — Configurable HTTP method, Content-Type, and custom headers

## Configuration

| Field | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| **Webhook URL** | Target HTTP endpoint URL | — | ✅ |
| **HTTP Method** | POST, PUT, or PATCH | `POST` | ❌ |
| **Content-Type** | Content-Type header value | `application/json` | ❌ |
| **Authorization** | Authorization header value | — | ❌ |
| **Custom Headers** | Additional headers (one per line, `Key: Value`) | — | ❌ |
| **Payload Template** | Custom JSON template with `{{variable}}` placeholders | — | ❌ |

## Setup Guide

### 1. Identify Your Endpoint

Determine the HTTP endpoint and authentication method of your target service. Common examples:

| Service | Endpoint | Auth |
| :--- | :--- | :--- |
| Ntfy | `https://ntfy.sh/your-topic` | None or Bearer token |
| Gotify | `https://gotify.example.com/message` | App token in URL or header |
| PagerDuty | `https://events.pagerduty.com/v2/enqueue` | Routing key in payload |
| Uptime Kuma | `https://uptime.example.com/api/push/...` | Token in URL |
| Custom API | Your endpoint | As needed |

### 2. Configure in DBackup

1. Go to **Notifications** in the sidebar
2. Click **Add Notification**
3. Select **Generic Webhook**
4. Enter the webhook URL
5. (Optional) Configure method, headers, and authentication
6. (Optional) Create a custom payload template
7. Click **Test** to verify
8. Save

## Default Payload

When no custom template is set, DBackup sends the following JSON payload:

```json
{
  "title": "Backup Successful",
  "message": "Job 'Production MySQL' completed successfully",
  "success": true,
  "color": "#00ff00",
  "timestamp": "2026-02-20T14:30:00.000Z",
  "eventType": "backup_success",
  "fields": [
    { "name": "Job", "value": "Production MySQL", "inline": true },
    { "name": "Duration", "value": "2m 30s", "inline": true },
    { "name": "Size", "value": "45.2 MB", "inline": true }
  ]
}
```

## Custom Payload Templates

Use `{{variable}}` placeholders to create your own payload structure. Available variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `{{title}}` | Event title | `Backup Successful` |
| `{{message}}` | Summary message | `Job 'Production' completed` |
| `{{success}}` | Boolean (as string) | `true` or `false` |
| `{{color}}` | Status hex color | `#00ff00` |
| `{{timestamp}}` | ISO 8601 timestamp | `2026-02-20T14:30:00.000Z` |
| `{{eventType}}` | Event type identifier | `backup_success` |
| `{{fields}}` | JSON array of fields | `[{"name":"Job","value":"Prod"}]` |

### Template Examples

::: details Ntfy
```json
{
  "topic": "dbackup",
  "title": "{{title}}",
  "message": "{{message}}",
  "priority": 3
}
```
:::

::: details Gotify
```json
{
  "title": "{{title}}",
  "message": "{{message}}",
  "priority": 5
}
```
Set **Authorization** to `Bearer YOUR_APP_TOKEN`.
:::

::: details PagerDuty
```json
{
  "routing_key": "YOUR_ROUTING_KEY",
  "event_action": "trigger",
  "payload": {
    "summary": "{{title}}: {{message}}",
    "severity": "critical",
    "source": "dbackup"
  }
}
```
:::

::: details Uptime Kuma (Push)
No template needed — just use the push URL as the webhook URL:
```
https://uptime.example.com/api/push/YOUR_PUSH_TOKEN?status=up&msg={{message}}
```
:::

::: details Simple Text Payload
```json
{
  "text": "[{{title}}] {{message}}"
}
```
:::

## Authentication

### Bearer Token

Set the **Authorization** field to:
```
Bearer your-api-token-here
```

### API Key Header

Use **Custom Headers** for non-standard authentication:
```
X-API-Key: your-api-key-here
```

### Basic Auth

Set the **Authorization** field to:
```
Basic base64-encoded-credentials
```

Generate with: `echo -n "user:password" | base64`

## Custom Headers

Add one header per line in `Key: Value` format:

```
X-Custom-Header: my-value
X-Source: dbackup
Accept: application/json
```

## Troubleshooting

### Connection Refused

```
Webhook returned 0: Connection refused
```

**Solutions:**
1. Verify the URL is correct and the service is running
2. Check firewall rules allow outbound connections from DBackup
3. If self-hosted, ensure the service is accessible from DBackup's network

### Authentication Failed

```
Webhook returned 401: Unauthorized
```

**Solutions:**
1. Verify the Authorization header value
2. Check if the API key or token has expired
3. Ensure the token has the required permissions

### Invalid Payload

```
Webhook returned 400: Bad Request
```

**Solutions:**
1. Verify your custom template is valid JSON
2. Check the target service's expected payload format
3. Ensure Content-Type matches what the service expects

### Template Variables Not Replaced

If you see literal `{{variable}}` in the payload:
1. Check for typos in variable names
2. Only the documented variables are supported
3. Variable names are case-sensitive

## Best Practices

1. **Start without a template** — Test with the default payload first, then customize
2. **Use HTTPS** — Always prefer encrypted connections
3. **Rotate tokens regularly** — Update API keys for the receiving service periodically
4. **Test after changes** — Always use the Test button after modifying configuration
5. **Keep templates simple** — Complex templates are harder to debug
6. **Document your integrations** — Note which services receive notifications and why
