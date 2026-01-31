# Audit Log System

The Audit Log system tracks significant user actions (Authentication, Resource Management, etc.) for security and compliance purposes.

## Architecture

### Database Schema

The system uses the `AuditLog` model in Prisma:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?  // Who performed the action (nullable for system actions)
  action     String   // What happened (e.g., CREATE, DELETE)
  resource   String   // What was affected (e.g., USER, JOB)
  resourceId String?  // ID of the affected object
  details    String?  // JSON string with additional info (diffs, metadata)
  ipAddress  String?  // Request context
  userAgent  String?  // Browser/client info
  createdAt  DateTime @default(now())

  user       User?    @relation(fields: [userId], references: [id])
}
```

### Constants

To ensure consistency, we use strict constants for Actions and Resources.

**Location**: `src/lib/core/audit-types.ts`

```typescript
export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  EXECUTE: 'EXECUTE',
  RESTORE: 'RESTORE',
} as const;

export const AUDIT_RESOURCES = {
  USER: 'USER',
  GROUP: 'GROUP',
  JOB: 'JOB',
  SOURCE: 'SOURCE',
  DESTINATION: 'DESTINATION',
  EXECUTION: 'EXECUTION',
  SYSTEM: 'SYSTEM',
  SSO_PROVIDER: 'SSO_PROVIDER',
} as const;
```

### Service Layer

**Location**: `src/services/audit-service.ts`

The `AuditService` handles:
- Writing logs to the database (`log()`)
- Fetching paginated and filtered logs (`getLogs()`)
- Generating statistics for UI filters (`getFilterStats()`)
- Retention management (auto-delete old entries)

## Usage Guide

### Logging an Event

Log an event whenever a significant state change occurs (typically in **Server Actions** or **Services**):

```typescript
import { auditService } from "@/services/audit-service";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";

export async function createSource(data: SourceInput) {
  // 1. Perform Business Logic
  const newSource = await db.adapterConfig.create({ ... });

  // 2. Log the Action
  if (session?.user) {
    await auditService.log(
      session.user.id,           // Actor (User ID)
      AUDIT_ACTIONS.CREATE,      // Action Type
      AUDIT_RESOURCES.SOURCE,    // Resource Type
      newSource.id,              // Resource ID
      { name: newSource.name },  // Additional details
      request                    // Request object (for IP/UserAgent)
    );
  }

  return newSource;
}
```

### Required Events to Log

| Action | Resource | When |
|--------|----------|------|
| LOGIN | USER | Successful authentication |
| LOGOUT | USER | Session terminated |
| CREATE | SOURCE/DESTINATION/JOB | New adapter or job created |
| UPDATE | SOURCE/DESTINATION/JOB | Configuration modified |
| DELETE | SOURCE/DESTINATION/JOB | Resource removed |
| EXECUTE | EXECUTION | Backup job triggered |
| RESTORE | EXECUTION | Database restored |
| CREATE/UPDATE/DELETE | USER | User management |
| CREATE/UPDATE/DELETE | GROUP | Permission group changes |

### Self-Service Actions

When a user performs an action on their own account (e.g., password change), tag it appropriately:

```typescript
await auditService.log(
  userId,
  AUDIT_ACTIONS.UPDATE,
  AUDIT_RESOURCES.USER,
  userId,
  { field: 'password', selfService: true }
);
```

## Retention Policy

The audit service automatically cleans up old entries based on the system setting `audit.retentionDays`:

```typescript
// Default: 90 days
const retentionDays = await getSystemSetting('audit.retentionDays', 90);
await auditService.cleanup(retentionDays);
```

This runs as a system task (`system.audit_cleanup`).

## API Endpoints

### Get Audit Logs

```http
GET /api/audit?page=1&limit=20&action=CREATE&resource=JOB
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `action` | string | Filter by action type |
| `resource` | string | Filter by resource type |
| `userId` | string | Filter by user |
| `startDate` | string | Filter from date (ISO) |
| `endDate` | string | Filter to date (ISO) |

### Get Filter Statistics

```http
GET /api/audit/stats
```

Returns counts grouped by action and resource for building filter dropdowns.
