# Healthcheck & Connectivity Monitoring

The Healthcheck system is designed to continuously monitor the availability and status of all configured database sources and storage destinations. It ensures that connection issues are detected early and can be tracked historically.

## 🧱 Architecture

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
  // ...
  lastHealthCheck      DateTime?     // Timestamp of last check
  lastStatus           HealthStatus  // Cached status for UI display
  consecutiveFailures  Int           // Counter for failure state machine
}
```

### Components

#### 1. Backend Service (`src/services/healthcheck-service.ts`)
The core service that performs the actual checks.
*   **Process**: Iterates over all adapters -> Executes `adapter.test()` -> Evaluates status.
*   **State Machine**:
    *   Success -> Status `ONLINE`, Failures = 0.
    *   Failure -> Failures + 1.
    *   Failures < 3 -> Status `DEGRADED`.
    *   Failures >= 3 -> Status `OFFLINE`.
*   **Retention**: Deletes logs older than 48 hours to control database size.

#### 2. System Task (`src/services/system-task-service.ts`)
The healthcheck is integrated as a system task (`system.health_check`).
*   **Interval**: Default runs every minute (`*/1 * * * *`).
*   Can be configured and manually triggered via the UI ("Settings" -> "System Tasks").

#### 3. Adapter Integration (`src/lib/adapters/*`)
Each adapter (`MySQL`, `Postgres`, `S3`, `Local` etc.) implements the `test(config)` method.
*   This method checks not just TCP connectivity but also performs a minimal logical operation (e.g., `SELECT VERSION()` or Write/Delete test on storage).

#### 4. Frontend Components
*   **Status Badge**: Visual indicator (Green/Orange/Red/Grey) in list views.
*   **Statistics**: Shows uptime (last 60 checks) and average latency.
*   **History Grid**: Interactive grid in a popover visualizing the history of the last hour.

## 💻 API Endpoints

### Get Health History
`GET /api/adapters/[id]/health-history`

Returns ping history and summarized statistics.

**Parameters:**
*   `limit` (default: 100): Number of entries to return.

**Response:**
```json
{
  "history": [
    { "id": "uuid", "status": "ONLINE", "latencyMs": 23, "createdAt": "...", "error": null },
    ...
  ],
  "stats": {
    "uptime": 98.5,    // Percentage
    "avgLatency": 45,  // Milliseconds
    "totalChecks": 60
  }
}
```

## 🧪 Testing

### Unit Tests
The state transition logic (Online -> Degraded -> Offline) is verified in `tests/unit/services/healthcheck-service.test.ts`.

### Manual Testing
1. Go to **Settings** -> **System Tasks**.
2. Find "Health Check & Connectivity".
3. Click on **Run Now**.
4. Check the logs in the terminal.
5. Go to **Sources** or **Destinations**, the status should be updated.
