# Notification Adapters

Notification adapters send alerts about backup status, system events, and user activity to various channels.

## Architecture Overview

DBackup has **two notification layers** that share the same adapters:

```
┌─────────────────────────────────────────────────────┐
│                Notification Adapters                │
│          (Discord, Email, future: Slack)            │
└───────────────┬─────────────────────┬───────────────┘
                │                     │
    ┌───────────┴──────┐   ┌─────────┴──────────┐
    │  Per-Job (Runner)│   │ System Notifications│
    │  04-completion   │   │ notify() service    │
    └──────────────────┘   └─────────────────────┘
```

| Layer | Trigger | Config Location |
| :--- | :--- | :--- |
| Per-Job | Runner pipeline step `04-completion.ts` | Job record (`notificationId`, `notifyCondition`) |
| System | `notify()` in `system-notification-service.ts` | `SystemSetting` (key: `notifications.config`) |

Both layers use `renderTemplate()` from `src/lib/notifications/templates.ts` to generate adapter-agnostic payloads.

## Available Adapters

| Adapter | ID | File | Description |
| :--- | :--- | :--- | :--- |
| Discord | `discord` | `src/lib/adapters/notification/discord.ts` | Discord webhook with rich embeds |
| Email | `email` | `src/lib/adapters/notification/email.tsx` | SMTP email with React HTML template |

## Interface

```typescript
interface NotificationAdapter {
  id: string;
  type: "notification";
  name: string;
  configSchema: ZodSchema;
  inputs: FormFieldDefinition[];

  send(
    config: unknown,
    message: string,
    context?: NotificationContext
  ): Promise<boolean>;

  test?(config: unknown): Promise<TestResult>;
}
```

The `NotificationContext` passed to `send()`:

```typescript
interface NotificationContext {
  success?: boolean;
  eventType?: string;      // e.g. "user_login", "backup_success"
  title?: string;          // Payload title for embeds/subjects
  fields?: Array<{         // Structured data for rich display
    name: string;
    value: string;
    inline?: boolean;
  }>;
  color?: string;          // Hex color for status indicators
}
```

## Discord Adapter

Sends rich embeds to Discord webhooks. The adapter builds embed objects from the `NotificationContext` fields:

```typescript
// Simplified core logic
async send(config, message, context) {
  const validated = DiscordSchema.parse(config);

  const embed: Record<string, unknown> = {
    title: context?.title ?? "Notification",
    description: message,
    color: parseInt((context?.color ?? "#6b7280").replace("#", ""), 16),
    timestamp: new Date().toISOString(),
  };

  if (context?.fields?.length) {
    embed.fields = context.fields.map((f) => ({
      name: f.name,
      value: f.value || "-",
      inline: f.inline ?? false,
    }));
  }

  await fetch(validated.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: validated.username,
      avatar_url: validated.avatarUrl || undefined,
      embeds: [embed],
    }),
  });
}
```

### Discord Schema

```typescript
const DiscordSchema = z.object({
  webhookUrl: z.string().url("Valid Webhook URL is required"),
  username: z.string().optional().default("Backup Manager"),
  avatarUrl: z.string().url().optional(),
});
```

## Email Adapter

Sends HTML emails via SMTP using `nodemailer`. The HTML body is rendered server-side from a React component (`SystemNotificationEmail`):

```typescript
// Simplified core logic
async send(config, message, context) {
  const validated = EmailSchema.parse(config);
  const transporter = nodemailer.createTransport({ /* ... */ });

  // Render React email template to static HTML
  const html = renderToStaticMarkup(
    <SystemNotificationEmail
      title={context?.title ?? "Notification"}
      message={message}
      fields={context?.fields}
      color={context?.color}
    />
  );

  await transporter.sendMail({
    from: validated.from,
    to: validated.to,
    subject: `[DBackup] ${context?.title ?? "Notification"}`,
    text: message,
    html,
  });
}
```

### Email Schema

```typescript
const EmailSchema = z.object({
  host: z.string().min(1, "SMTP Host is required"),
  port: z.coerce.number().default(587),
  secure: z.enum(["none", "ssl", "starttls"]).default("starttls"),
  user: z.string().optional(),
  password: z.string().optional(),
  from: z.string().min(1, "From email is required"),
  to: z.string().email("Valid To email is required"),
});
```

### Email Template

The unified React template lives in `src/components/email/system-notification-template.tsx`. It renders:
- A colored header bar (color matches the event type)
- Title text
- Message body
- Structured fields in a table layout
- Footer with timestamp

All notification types (backup, login, restore, etc.) share this single template.

---

## System Notification Framework

The system notification framework handles events beyond individual backup jobs.

### File Structure

```
src/lib/notifications/
├── types.ts        # Type definitions, event constants, config shape
├── events.ts       # Event registry with metadata
├── templates.ts    # Template functions → adapter-agnostic payloads
└── index.ts        # Barrel exports

src/services/
└── system-notification-service.ts   # Core dispatch service

src/app/actions/
└── notification-settings.ts         # Server actions for UI

src/components/settings/
└── notification-settings.tsx        # Settings UI component
```

### Event Types

Defined in `src/lib/notifications/types.ts`:

```typescript
export const NOTIFICATION_EVENTS = {
  USER_LOGIN: "user_login",
  USER_CREATED: "user_created",
  BACKUP_SUCCESS: "backup_success",    // Used by runner only
  BACKUP_FAILURE: "backup_failure",    // Used by runner only
  RESTORE_COMPLETE: "restore_complete",
  RESTORE_FAILURE: "restore_failure",
  CONFIG_BACKUP: "config_backup",
  SYSTEM_ERROR: "system_error",
} as const;
```

::: info Backup events
`BACKUP_SUCCESS` and `BACKUP_FAILURE` have templates but are **not** registered in the system event list (`events.ts`). They are only used by the runner pipeline for per-job notifications, avoiding duplicate notifications.
:::

### Event Definitions

Each event is registered in `src/lib/notifications/events.ts` with metadata:

```typescript
interface NotificationEventDefinition {
  id: NotificationEventType;
  name: string;
  description: string;
  category: "auth" | "backup" | "restore" | "system";
  defaultEnabled: boolean;
  supportsNotifyUser?: boolean;  // Can send direct email to affected user
}
```

Currently registered system events:

| Event | Category | Default | Supports Notify User |
| :--- | :--- | :--- | :--- |
| `user_login` | auth | Disabled | ✅ |
| `user_created` | auth | Disabled | ✅ |
| `restore_complete` | restore | Enabled | ❌ |
| `restore_failure` | restore | Enabled | ❌ |
| `config_backup` | system | Disabled | ❌ |
| `system_error` | system | Enabled | ❌ |

### Template System

Templates in `src/lib/notifications/templates.ts` convert typed event data into adapter-agnostic `NotificationPayload` objects:

```typescript
interface NotificationPayload {
  title: string;           // Email subject, embed title
  message: string;         // Plain text body
  fields?: Array<{         // Structured data
    name: string;
    value: string;
    inline?: boolean;
  }>;
  color?: string;          // Hex color
  success: boolean;        // Success/failure flag
}
```

The `renderTemplate(event)` dispatcher calls the matching function based on `event.eventType`.

### Configuration Storage

System notification config is stored as JSON in the `SystemSetting` table under key `notifications.config`:

```typescript
interface SystemNotificationConfig {
  globalChannels: string[];     // Default AdapterConfig IDs
  events: Record<string, {
    enabled: boolean;
    channels: string[] | null;  // null = use globalChannels
    notifyUser?: NotifyUserMode; // "none" | "also" | "only"
  }>;
}
```

### Dispatch Flow (`notify()`)

The `notify()` function in `system-notification-service.ts` handles the full dispatch:

```
notify(event)
    │
    ├── Load config from SystemSetting
    ├── Check if event is enabled (config or default)
    ├── Resolve channels (event-level override or global)
    ├── renderTemplate(event) → NotificationPayload
    ├── registerAdapters() (ensure adapters are loaded)
    │
    ├── If notifyUser ≠ "only":
    │   └── Send to all admin channels (Discord, Email, etc.)
    │
    └── If notifyUser = "also" or "only":
        ├── Filter channels to email-type adapters only
        ├── Extract user email from event data
        └── Send via email adapter with overridden `to` field
```

Key design decisions:
- **Fire-and-forget**: `notify()` catches all errors and never throws. Callers are not blocked by notification failures.
- **User-targeted delivery**: For auth events (`user_login`, `user_created`), the service can send a direct email to the affected user by overriding the `to` field in the email adapter config.
- **Email-only for user notifications**: Only adapters matching `EMAIL_ADAPTER_IDS` (`["email"]`) support per-user delivery. Discord and other channels are excluded.

### Integration Points

System notifications are fired from:

| Location | Event |
| :--- | :--- |
| `src/lib/auth.ts` (`databaseHooks.session.create.after`) | `USER_LOGIN` |
| `src/app/actions/user.ts` (`createUser`) | `USER_CREATED` |
| `src/services/restore-service.ts` | `RESTORE_COMPLETE`, `RESTORE_FAILURE` |
| `src/lib/runner/config-runner.ts` | `CONFIG_BACKUP` |

Example integration:

```typescript
// src/lib/auth.ts – Login notification
databaseHooks: {
  session: {
    create: {
      after: async (session) => {
        const user = await prisma.user.findUnique({ ... });
        notify({
          eventType: NOTIFICATION_EVENTS.USER_LOGIN,
          data: {
            userName: user.name,
            email: user.email,
            timestamp: new Date().toISOString(),
          },
        });
      },
    },
  },
}
```

### Server Actions

`src/app/actions/notification-settings.ts` provides:

| Action | Permission | Description |
| :--- | :--- | :--- |
| `getNotificationSettings()` | `SETTINGS.READ` | Load config, available channels, event definitions |
| `updateNotificationSettings(data)` | `SETTINGS.WRITE` | Validate & persist config |
| `sendTestNotification(eventType)` | `SETTINGS.WRITE` | Send test through enabled channels |

### UI Component

`src/components/settings/notification-settings.tsx` renders the Settings → Notifications tab:

1. **Global Channel Selector** – Multi-select popover with search to choose default notification channels
2. **Event Cards** – Grouped by category (Auth, Restore, System) with:
   - Toggle switch (enable/disable)
   - Channel override popover with per-channel checkboxes
   - "Notify user directly" dropdown (only for `supportsNotifyUser` events when an email channel is selected)
   - Test button
3. **Auto-save** – Every UI change immediately persists via `toast.promise()`

---

## Per-Job Notification Flow

Per-job notifications are sent from the runner pipeline step `04-completion.ts`:

```
RunnerContext (job, execution, metadata)
    │
    ├── Job has notificationId? → Load AdapterConfig
    ├── Check notifyCondition (always / success / failure)
    ├── renderTemplate(BACKUP_SUCCESS or BACKUP_FAILURE)
    ├── adapter.send(config, payload.message, { title, fields, color })
    └── Log result
```

This uses the same `renderTemplate()` and `NotificationPayload` system as system notifications, ensuring consistent message formatting across both layers.

---

## Creating a New Notification Adapter

### 1. Define the Schema

```typescript
// src/lib/adapters/definitions.ts
export const SlackSchema = z.object({
  webhookUrl: z.string().url(),
  channel: z.string().optional(),
  username: z.string().default("DBackup"),
});
```

### 2. Implement the Adapter

```typescript
// src/lib/adapters/notification/slack.ts
import { SlackSchema } from "@/lib/adapters/definitions";

export const SlackAdapter: NotificationAdapter = {
  id: "slack",
  type: "notification",
  name: "Slack",
  configSchema: SlackSchema,
  inputs: [
    { key: "webhookUrl", label: "Webhook URL", type: "url", required: true },
    { key: "channel", label: "Channel", type: "text" },
    { key: "username", label: "Username", type: "text", defaultValue: "DBackup" },
  ],

  async send(config, message, context) {
    const validated = SlackSchema.parse(config);

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: context?.title ?? "Notification",
        },
      },
    ];

    // Add fields as Slack sections
    if (context?.fields?.length) {
      blocks.push({
        type: "section",
        fields: context.fields.map((f) => ({
          type: "mrkdwn",
          text: `*${f.name}:*\n${f.value}`,
        })),
      });
    }

    await fetch(validated.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: validated.channel,
        username: validated.username,
        blocks,
      }),
    });

    return true;
  },

  async test(config) {
    const validated = SlackSchema.parse(config);
    try {
      await fetch(validated.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "🧪 DBackup test notification",
        }),
      });
      return { success: true, message: "Test message sent" };
    } catch (error) {
      return { success: false, message: `Slack error: ${error}` };
    }
  },
};
```

### 3. Register the Adapter

```typescript
// src/lib/adapters/index.ts
import { SlackAdapter } from "./notification/slack";

export function registerAdapters() {
  // ... existing registrations
  registry.register(SlackAdapter);
}
```

### 4. Add to Definitions

Add the schema and UI field definitions to `src/lib/adapters/definitions.ts`.

The adapter will automatically appear in the notification channel selector across both per-job and system notifications.

::: tip User-targeted delivery
If your new adapter should support per-user delivery (like Email does), add its `id` to the `EMAIL_ADAPTER_IDS` array in `system-notification-service.ts`. The adapter's config must have a `to` field that can be overridden.
:::

---

## Adding a New System Event

### 1. Add the Event Constant

```typescript
// src/lib/notifications/types.ts
export const NOTIFICATION_EVENTS = {
  // ... existing events
  MY_NEW_EVENT: "my_new_event",
} as const;
```

### 2. Define the Data Interface

```typescript
// src/lib/notifications/types.ts
export interface MyNewEventData {
  someField: string;
  timestamp: string;
}
```

Add it to the `NotificationEventData` union:

```typescript
export type NotificationEventData =
  // ... existing entries
  | { eventType: typeof NOTIFICATION_EVENTS.MY_NEW_EVENT; data: MyNewEventData };
```

### 3. Register the Event

```typescript
// src/lib/notifications/events.ts
{
  id: NOTIFICATION_EVENTS.MY_NEW_EVENT,
  name: "My New Event",
  description: "Description for the settings UI.",
  category: "system",
  defaultEnabled: false,
  // supportsNotifyUser: true  // Only if event carries a user email
},
```

### 4. Create the Template

```typescript
// src/lib/notifications/templates.ts
function myNewEventTemplate(data: MyNewEventData): NotificationPayload {
  return {
    title: "My New Event",
    message: `Something happened: ${data.someField}`,
    fields: [
      { name: "Field", value: data.someField, inline: true },
      { name: "Time", value: data.timestamp, inline: true },
    ],
    color: "#3b82f6",
    success: true,
  };
}
```

Add the case to `renderTemplate()`:

```typescript
case NOTIFICATION_EVENTS.MY_NEW_EVENT:
  return myNewEventTemplate(event.data);
```

### 5. Fire the Event

```typescript
import { notify } from "@/services/system-notification-service";
import { NOTIFICATION_EVENTS } from "@/lib/notifications/types";

notify({
  eventType: NOTIFICATION_EVENTS.MY_NEW_EVENT,
  data: {
    someField: "value",
    timestamp: new Date().toISOString(),
  },
});
```

The event will automatically appear in the Settings → Notifications UI with its category, description, and default state.

## Related Documentation

- [Adapter System](/developer-guide/core/adapters) – How adapters are registered
- [Database Adapters](/developer-guide/adapters/database) – Database dump/restore adapters
- [Storage Adapters](/developer-guide/adapters/storage) – File upload/download adapters
- [Runner Pipeline](/developer-guide/core/runner) – Backup execution steps
- [Service Layer](/developer-guide/core/services) – Business logic architecture
