# Logging System Documentation

## Overview

The Database Backup Manager uses a structured logging system to ensure consistent tracking of executions (Backups, Restores) and to provide a rich UI experience. Logs are no longer simple strings but structured JSON objects (`LogEntry`).

## Core Concepts

### 1. The `LogEntry` Structure

Defined in `src/lib/core/logs.ts`:

```typescript
export interface LogEntry {
  timestamp: string;      // ISO String
  level: LogLevel;        // 'info' | 'success' | 'warning' | 'error'
  type: LogType;          // 'general' | 'command'
  message: string;        // Short, human-readable message
  stage?: string;         // Current execution stage (e.g. "Initialization", "Dump", "Upload")
  details?: string;       // Long output (e.g. shell command, stdout, stack trace)
  context?: Record<string, any>; // Additional metadata
}
```

### 2. Usage in Services

Services (like `BackupService` or `RestoreService`) are responsible for managing the lifecycle of an execution and its logs.

- **Initialization**: Create a `LogEntry[]` buffer.
- **Flushing**: Periodically write logs to the `Execution` database record to avoid excessive DB writes.
- **Stage Management**: Track the current `stage` (e.g., "Downloading") and attach it to every new log entry.

#### Example (Service):

```typescript
const log = (msg: string, level: LogLevel = 'info', type: LogType = 'general', details?: string) => {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        message: msg,
        level: level,
        type: type, // Use 'command' for shell commands
        details: details, // Put the command string or output here
        stage: currentStage // e.g. "Restoring"
    };
    internalLogs.push(entry);
    // Flush to DB...
};

// Simple usage
log("Download started");

// Command usage (renders nicely in UI)
log("Running pg_restore", "info", "command", "pg_restore -d mydb file.dump");
```

### 3. Usage in Adapters

Adapters should **not** write to the database directly. They accept a callback function `onLog`.

**Adapter Interface Rule**:
The `restore` (or `dump`) method should accept an `onLog` callback with this signature:

```typescript
onLog?: (msg: string, level?: LogLevel, type?: LogType, details?: string) => void
```

#### Example (Adapter):

```typescript
// src/lib/adapters/database/postgres/restore.ts

export async function restore(config: any, path: string, onLog: Function) {
    const log = (msg: string, level = 'info', type = 'general', details?: string) => {
        if (onLog) onLog(msg, level, type, details);
    };

    // Correct way to log a command
    const cmd = "psql -h localhost ...";
    log("Starting restore process", "info", "command", cmd);

    // ... execution ...
}
```

## UI Representation

 The `LogViewer` component (`src/components/execution/log-viewer.tsx`) handles the rendering:

- **Grouping**: Logs are grouped by `stage`.
- **Icons**: Determined by `level` (Info, CheckCircle, Alert).
- **Commands**: If `type === 'command'`, the message is shown, and the `details` field is hidden behind a collapsable toggle. This keeps the log clean while keeping the exact command accessible for debugging.
- **Timestamps**: Rendered using user preference via `DateDisplay`.

## Best Practices

1. **Keep Messages Short**: The `message` field is for the UI summary. Put huge outputs in `details`.
2. **Use Stages**: Always update the stage when moving to a new logical step (e.g. "Decrypting").
3. **Log Everything Important**: But distinguish between `info` (normal flow) and `general` logs versus `command` logs (technical details).
4. **Error Handling**: When catching an error, log it with `level: 'error'`. This flags the stage as failed in the UI.
