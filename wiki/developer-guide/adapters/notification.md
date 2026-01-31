# Notification Adapters

Notification adapters send alerts about backup status to various channels.

## Available Adapters

| Adapter | ID | Description |
| :--- | :--- | :--- |
| Discord | `discord` | Discord webhook |
| Email | `email` | SMTP email |

## Interface

```typescript
interface NotificationAdapter {
  id: string;
  type: "notification";
  name: string;
  configSchema: ZodSchema;

  send(
    config: unknown,
    message: string,
    context: NotificationContext
  ): Promise<void>;

  test(config: unknown): Promise<TestResult>;
}

interface NotificationContext {
  jobName: string;
  status: "Success" | "Failed";
  duration: number;      // Milliseconds
  size?: number;         // Bytes
  error?: string;        // Error message if failed
  databases?: string[];  // Affected databases
}
```

## Discord Adapter

Sends rich embeds to Discord webhooks:

```typescript
const DiscordAdapter: NotificationAdapter = {
  id: "discord",
  type: "notification",
  name: "Discord",
  configSchema: DiscordSchema,

  async send(config, message, context) {
    const validated = DiscordSchema.parse(config);

    const embed = {
      title: context.status === "Success"
        ? "✅ Backup Successful"
        : "❌ Backup Failed",
      color: context.status === "Success" ? 0x00ff00 : 0xff0000,
      fields: [
        { name: "Job", value: context.jobName, inline: true },
        { name: "Duration", value: formatDuration(context.duration), inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    if (context.size) {
      embed.fields.push({
        name: "Size",
        value: formatBytes(context.size),
        inline: true,
      });
    }

    if (context.error) {
      embed.fields.push({
        name: "Error",
        value: context.error.substring(0, 1024),
        inline: false,
      });
    }

    await fetch(validated.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message,
        embeds: [embed],
      }),
    });
  },

  async test(config) {
    const validated = DiscordSchema.parse(config);

    try {
      await fetch(validated.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "🧪 DBackup test notification",
        }),
      });

      return { success: true, message: "Test message sent" };
    } catch (error) {
      return { success: false, message: `Discord error: ${error}` };
    }
  },
};
```

### Discord Schema

```typescript
const DiscordSchema = z.object({
  webhookUrl: z.string()
    .url()
    .refine(
      url => url.includes("discord.com/api/webhooks"),
      "Must be a Discord webhook URL"
    ),
  mentionOnFailure: z.boolean().default(false),
  mentionRoleId: z.string().optional(),
});
```

## Email Adapter

Sends HTML emails via SMTP:

```typescript
import nodemailer from "nodemailer";

const EmailAdapter: NotificationAdapter = {
  id: "email",
  type: "notification",
  name: "Email (SMTP)",
  configSchema: EmailSchema,

  async send(config, message, context) {
    const validated = EmailSchema.parse(config);

    const transporter = nodemailer.createTransport({
      host: validated.host,
      port: validated.port,
      secure: validated.secure,
      auth: {
        user: validated.username,
        pass: validated.password,
      },
    });

    const html = buildEmailHtml(context);

    await transporter.sendMail({
      from: validated.from,
      to: validated.to,
      subject: `[DBackup] ${context.jobName}: ${context.status}`,
      text: message,
      html,
    });
  },

  async test(config) {
    const validated = EmailSchema.parse(config);

    try {
      const transporter = nodemailer.createTransport({
        host: validated.host,
        port: validated.port,
        secure: validated.secure,
        auth: {
          user: validated.username,
          pass: validated.password,
        },
      });

      await transporter.verify();

      await transporter.sendMail({
        from: validated.from,
        to: validated.to,
        subject: "[DBackup] Test Notification",
        text: "This is a test email from DBackup.",
      });

      return { success: true, message: "Test email sent" };
    } catch (error) {
      return { success: false, message: `SMTP error: ${error}` };
    }
  },
};

function buildEmailHtml(context: NotificationContext): string {
  const statusColor = context.status === "Success" ? "#22c55e" : "#ef4444";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .status { color: ${statusColor}; font-weight: bold; }
        .details { margin-top: 20px; }
        .detail { margin: 5px 0; }
      </style>
    </head>
    <body>
      <h2>Backup <span class="status">${context.status}</span></h2>
      <div class="details">
        <div class="detail"><strong>Job:</strong> ${context.jobName}</div>
        <div class="detail"><strong>Duration:</strong> ${formatDuration(context.duration)}</div>
        ${context.size ? `<div class="detail"><strong>Size:</strong> ${formatBytes(context.size)}</div>` : ""}
        ${context.error ? `<div class="detail"><strong>Error:</strong> ${context.error}</div>` : ""}
      </div>
    </body>
    </html>
  `;
}
```

### Email Schema

```typescript
const EmailSchema = z.object({
  host: z.string().min(1, "SMTP host required"),
  port: z.coerce.number().default(587),
  secure: z.boolean().default(false),
  username: z.string().min(1),
  password: z.string().min(1),
  from: z.string().email("Valid sender email required"),
  to: z.string().min(1, "Recipients required"),
});
```

## Notification Conditions

Notifications can be configured to send only on certain conditions:

```typescript
interface NotificationConfig {
  adapterId: string;
  config: Record<string, unknown>;
  conditions: {
    onSuccess: boolean;
    onFailure: boolean;
  };
}
```

The runner checks these conditions:

```typescript
async function sendNotification(ctx: RunnerContext) {
  const notification = ctx.job.notification;

  // Check conditions
  if (ctx.status === "Success" && !notification.conditions.onSuccess) return;
  if (ctx.status === "Failed" && !notification.conditions.onFailure) return;

  const adapter = registry.get(notification.adapterId) as NotificationAdapter;

  await adapter.send(
    notification.config,
    `Backup ${ctx.status.toLowerCase()}: ${ctx.job.name}`,
    {
      jobName: ctx.job.name,
      status: ctx.status,
      duration: Date.now() - ctx.execution.startedAt.getTime(),
      size: ctx.metadata.size,
      error: ctx.status === "Failed" ? ctx.logs.join("\n") : undefined,
    }
  );
}
```

## Creating a New Notification Adapter

### Example: Slack Adapter

1. **Create schema**:
   ```typescript
   const SlackSchema = z.object({
     webhookUrl: z.string().url(),
     channel: z.string().optional(),
     username: z.string().default("DBackup"),
   });
   ```

2. **Create adapter**:
   ```typescript
   const SlackAdapter: NotificationAdapter = {
     id: "slack",
     type: "notification",
     name: "Slack",
     configSchema: SlackSchema,

     async send(config, message, context) {
       const validated = SlackSchema.parse(config);

       const blocks = [
         {
           type: "header",
           text: {
             type: "plain_text",
             text: context.status === "Success"
               ? "✅ Backup Successful"
               : "❌ Backup Failed",
           },
         },
         {
           type: "section",
           fields: [
             { type: "mrkdwn", text: `*Job:*\n${context.jobName}` },
             { type: "mrkdwn", text: `*Duration:*\n${formatDuration(context.duration)}` },
           ],
         },
       ];

       await fetch(validated.webhookUrl, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           channel: validated.channel,
           username: validated.username,
           blocks,
         }),
       });
     },

     async test(config) {
       // Send test message
     },
   };
   ```

3. **Register** in `src/lib/adapters/index.ts`

## Helper Functions

```typescript
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}
```

## Related Documentation

- [Adapter System](/developer-guide/core/adapters)
- [Database Adapters](/developer-guide/adapters/database)
- [Storage Adapters](/developer-guide/adapters/storage)
