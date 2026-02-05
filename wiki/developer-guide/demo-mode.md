# Demo Mode

This guide explains how to set up and run DBackup in demo mode, which is useful for showcasing the application's features without risking production data.

## Overview

Demo mode provides:
- **Pre-configured credentials** for easy login
- **Blocked sensitive actions** to prevent demo users from breaking the instance
- **Automatic reset** every 10 minutes to ensure a clean state
- **Sample databases** (MySQL, PostgreSQL, MongoDB) with realistic data

## Quick Start

```bash
# Start the demo environment
docker-compose -f docker-compose.demo.yml up -d

# View logs
docker-compose -f docker-compose.demo.yml logs -f dbackup
```

Open [http://localhost:3000](http://localhost:3000) and use:
- **Email:** `demo@dbackup.app`
- **Password:** `demo123456`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Demo Environment                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    MySQL     │  │  PostgreSQL  │  │   MongoDB    │       │
│  │  (E-Commerce)│  │    (Blog)    │  │    (IoT)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │   DBackup   │                          │
│                    │ (Demo Mode) │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │ Demo Reset  │ ◄─── Resets every 10 min │
│                    └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEMO_MODE` | Yes | - | Set to `true` to enable demo mode |
| `NEXT_PUBLIC_DEMO_MODE` | Yes | - | Set to `true` for client-side demo features |
| `DEMO_USER` | Yes | - | Demo user email address |
| `DEMO_PASSWORD` | Yes | - | Demo user password |

### Example Configuration

```yaml
environment:
  - DEMO_MODE=true
  - NEXT_PUBLIC_DEMO_MODE=true
  - DEMO_USER=demo@dbackup.app
  - DEMO_PASSWORD=demo123456
```

## Blocked Actions

The following actions are disabled in demo mode to prevent users from breaking the demo instance:

| Action | Reason |
|--------|--------|
| Password change | Prevents locking out other demo users |
| Email change | Prevents breaking login |
| User create/delete | Preserves demo user |
| 2FA enable/disable/reset | Prevents locking out users |
| Passkey toggle | Prevents authentication issues |
| SSO provider management | Prevents authentication issues |
| Encryption key deletion | Prevents breaking existing backups |

### Implementation

Guards are implemented using the `assertNotDemoMode()` function:

```typescript
import { assertNotDemoMode } from "@/lib/demo-mode";

export async function updateOwnPassword(currentPassword: string, newPassword: string) {
    assertNotDemoMode("password-change");
    // ... rest of implementation
}
```

## UI Components

### Demo Login Button

When demo mode is enabled, a "Use Demo Credentials" button appears on the login page that auto-fills the demo credentials.

### Demo Banner

A yellow banner appears at the top of the dashboard showing:
- Demo mode indicator
- Countdown timer until next reset
- Warning that some actions are restricted

## Sample Databases

### MySQL (E-Commerce Schema)

- **Host:** `mysql-demo:3306`
- **Database:** `demo_app`, `demo_analytics`
- **Tables:** `users`, `products`, `orders`, `order_items`, `events`
- **Sample data:** 5 users, 10 products, 8 orders

### PostgreSQL (Blog/CMS Schema)

- **Host:** `postgres-demo:5432`
- **Database:** `demo_app`
- **Tables:** `authors`, `posts`, `categories`, `tags`, `comments`
- **Sample data:** 3 authors, 5 posts, 6 comments

### MongoDB (IoT/Telemetry Schema)

- **Host:** `mongo-demo:27017`
- **Database:** `demo_app`
- **Collections:** `devices`, `readings`, `alerts`, `users`
- **Sample data:** 5 devices, ~1400 sensor readings (24h), 3 alerts

## Reset Mechanism

The demo environment automatically resets every 10 minutes using a sidecar container:

```yaml
demo-reset:
  image: alpine:latest
  entrypoint: |
    sh -c '
      while true; do
        sleep 600  # 10 minutes

        # Reset SQLite database
        rm -f /app/db/dbackup.db*
        cp /seed/dbackup.db /app/db/dbackup.db

        # Clear backup files
        find /backups -type f -delete

        echo "Reset complete"
      done
    '
```

## Generating the Seed Database

To create or update the seed database:

```bash
# 1. Start with a fresh database
rm -f .test/db-data/dbackup.db

# 2. Run the seed script
DATABASE_URL="file:.test/db-data/dbackup.db" pnpm tsx scripts/demo/seed-demo.ts

# 3. Copy to demo seed location
cp .test/db-data/dbackup.db scripts/demo/seed.db
```

The seed script creates:
- Demo user with SuperAdmin permissions
- 3 database sources (MySQL, PostgreSQL, MongoDB)
- 1 local storage destination
- 4 backup jobs (3 enabled, 1 disabled for demonstration)
- System settings (max concurrent jobs, audit retention)

## Hosting Recommendations

### Option 1: Docker Compose (Self-hosted)

Best for: Internal demos, development testing

```bash
docker-compose -f docker-compose.demo.yml up -d
```

### Option 2: Railway / Render

Best for: Public demos, zero-maintenance

1. Deploy using the demo docker-compose
2. Set up a cron job to restart the app every 10 minutes
3. Use managed database services if DB containers aren't supported

### Option 3: Kubernetes

Best for: Large-scale demos, multiple instances

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: demo-reset
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reset
            image: alpine
            command: ["/bin/sh", "-c", "kubectl rollout restart deployment/dbackup-demo"]
```

## Customization

### Changing Reset Interval

Update the sleep duration in `docker-compose.demo.yml`:

```yaml
demo-reset:
  entrypoint: |
    sh -c '
      while true; do
        sleep 300  # 5 minutes instead of 10
        # ...
      '
```

Also update the banner in `src/components/utils/demo-banner.tsx`:

```tsx
<DemoBanner resetInterval={5} />
```

### Adding Custom Demo Data

1. Modify the SQL/JS init scripts in `scripts/demo/`
2. Update `scripts/demo/seed-demo.ts` for additional DBackup configuration
3. Regenerate the seed database

### Disabling Specific Features

Add new blocked actions to `src/lib/demo-mode.ts`:

```typescript
export const DEMO_BLOCKED_ACTIONS = [
  // ... existing actions
  "my-new-action",
] as const;
```

Then use `assertNotDemoMode("my-new-action")` in the relevant Server Action.

## Troubleshooting

### Demo Banner Not Showing

Ensure `NEXT_PUBLIC_DEMO_MODE=true` is set. The `NEXT_PUBLIC_` prefix is required for client-side access.

### Database Connection Errors

Check that the database containers are healthy:

```bash
docker-compose -f docker-compose.demo.yml ps
```

Wait for all services to show "healthy" status.

### Reset Not Working

Check the reset container logs:

```bash
docker-compose -f docker-compose.demo.yml logs demo-reset
```

Ensure the seed database exists at `scripts/demo/seed.db`.

### Blocked Action Errors

If users see "This action is disabled in demo mode", this is expected behavior. The error message includes the reason.

## Security Considerations

::: warning
Demo mode is designed for **demonstration purposes only**. Do not use demo mode in production environments.
:::

- Demo credentials are publicly visible
- The reset mechanism may cause brief downtime
- Backup files are periodically deleted
- SSO providers should not be configured in demo mode

## File Reference

| File | Purpose |
|------|---------|
| [src/lib/demo-mode.ts](../../src/lib/demo-mode.ts) | Core demo mode utilities |
| [src/components/utils/demo-banner.tsx](../../src/components/utils/demo-banner.tsx) | Demo banner component |
| [docker-compose.demo.yml](../../docker-compose.demo.yml) | Demo environment configuration |
| [scripts/demo/seed-demo.ts](../../scripts/demo/seed-demo.ts) | Database seeding script |
| [scripts/demo/mysql-init.sql](../../scripts/demo/mysql-init.sql) | MySQL sample data |
| [scripts/demo/postgres-init.sql](../../scripts/demo/postgres-init.sql) | PostgreSQL sample data |
| [scripts/demo/mongo-init.js](../../scripts/demo/mongo-init.js) | MongoDB sample data |
