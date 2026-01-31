# Healthcheck & Connectivity Monitoring

The Healthcheck system continuously monitors the availability and status of all configured database sources and storage destinations. It ensures that connection issues are detected early and can be tracked historically.

## Architecture

### Data Model

The system extends the Prisma schema with a dedicated log table for health checks and adds caching fields to the `AdapterConfig` model.

```prisma
// Status states for adapters
enum HealthStatus {
  ONLINE    // Connection successful
  DEGRADED  // Transient failures (first/second attempt failed)
  OFFLINE   // Persistent failure (>= 3 consecutive failures)
}

// Log entry for each check cycle
model HealthCheckLog {
  id              String        @id
  adapterConfigId String
  status          HealthStatus
  latencyMs       Int           // Measured latency in milliseconds
  error           String?       // Error message if failed
  createdAt       DateTime

  adapterConfig   AdapterConfig @relation(...)
}

model AdapterConfig {
  // ...existing fields
  lastHealthCheck      DateTime?     // Timestamp of last check
  lastStatus           HealthStatus  // Cached status for UI display
  consecutiveFailures  Int           // Counter for failure state machine
}
```

### Components Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  System Task    │────▶│ Healthcheck      │────▶│ Adapter.test()  │
│  (Scheduler)    │     │ Service          │     │ (MySQL, S3...)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ HealthCheckLog   │
                        │ (Database)       │
                        └──────────────────┘
```

## Backend Service

**Location**: `src/services/healthcheck-service.ts`

The core service that performs the actual health checks.

### Process Flow

1. Iterates over all configured adapters
2. Executes `adapter.test()` for each
3. Evaluates status based on result
4. Updates database with results

### State Machine

The service implements a failure state machine to avoid flapping between states:

| Condition | Result |
|-----------|--------|
| Success | Status = `ONLINE`, Failures = 0 |
| Failure | Failures + 1 |
| Failures < 3 | Status = `DEGRADED` |
| Failures >= 3 | Status = `OFFLINE` |

```typescript
// Simplified state logic
if (success) {
  status = HealthStatus.ONLINE;
  consecutiveFailures = 0;
} else {
  consecutiveFailures++;
  status = consecutiveFailures >= 3
    ? HealthStatus.OFFLINE
    : HealthStatus.DEGRADED;
}
```

### Retention

The service automatically deletes logs older than 48 hours to control database size.

## System Task Integration

**Location**: `src/services/system-task-service.ts`

The healthcheck is integrated as a system task (`system.health_check`).

- **Default Interval**: Every minute (`*/1 * * * *`)
- **Configuration**: Settings → System Tasks
- **Manual Trigger**: Can be run on-demand via UI

## Adapter Integration

Each adapter implements the `test(config)` method from the adapter interface:

```typescript
interface DatabaseAdapter {
  test(config: DatabaseConfig): Promise<TestResult>;
  // ...
}

interface StorageAdapter {
  test(config: StorageConfig): Promise<TestResult>;
  // ...
}
```

### What Gets Tested

The `test()` method performs more than just TCP connectivity:

| Adapter Type | Test Operation |
|--------------|----------------|
| MySQL/MariaDB | `SELECT VERSION()` |
| PostgreSQL | `SELECT version()` |
| MongoDB | `db.admin().ping()` |
| SQLite | File existence + read |
| MSSQL | `SELECT @@VERSION` |
| S3 | `HeadBucket` operation |
| SFTP | Directory listing |
| Local | Directory access check |

## Frontend Components

### Status Badge

Visual indicator displayed in list views:

| Status | Color | Icon |
|--------|-------|------|
| ONLINE | Green | ✓ |
| DEGRADED | Orange | ⚠ |
| OFFLINE | Red | ✗ |
| UNKNOWN | Grey | ? |

### Statistics Display

Shows aggregated metrics:
- **Uptime**: Percentage of successful checks (last 60 entries)
- **Average Latency**: Mean response time in milliseconds
- **Total Checks**: Number of checks in history

### History Grid

Interactive popover grid visualizing the last hour of health checks with color-coded cells.

## API Reference

### Get Health History

```http
GET /api/adapters/[id]/health-history
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Number of entries to return |

**Response:**

```json
{
  "history": [
    {
      "id": "clx123...",
      "status": "ONLINE",
      "latencyMs": 23,
      "createdAt": "2026-01-31T10:00:00Z",
      "error": null
    }
  ],
  "stats": {
    "uptime": 98.5,
    "avgLatency": 45,
    "totalChecks": 60
  }
}
```

## Testing

### Unit Tests

The state transition logic (Online → Degraded → Offline) is verified in:

```
tests/unit/services/healthcheck-service.test.ts
```

### Manual Testing

1. Go to **Settings** → **System Tasks**
2. Find "Health Check & Connectivity"
3. Click **Run Now**
4. Check the terminal logs for output
5. Navigate to **Sources** or **Destinations** — status badges should be updated

## Configuration

The healthcheck interval can be configured per-installation:

```typescript
// Default cron expression (every minute)
const HEALTHCHECK_CRON = '*/1 * * * *';
```

For high-availability setups, consider:
- Reducing interval to 30 seconds
- Increasing retention beyond 48 hours
- Adding external monitoring integration
