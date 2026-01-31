# Logging System

The Database Backup Manager uses a structured logging system to ensure consistent tracking of executions (Backups, Restores) and to provide a rich UI experience.

## Core Concepts

### The LogEntry Structure

Logs are structured JSON objects, not simple strings.

**Location**: `src/lib/core/logs.ts`

```typescript
export interface LogEntry {
  timestamp: string;      // ISO 8601 format
  level: LogLevel;        // 'info' | 'success' | 'warning' | 'error'
  type: LogType;          // 'general' | 'command'
  message: string;        // Short, human-readable message
  stage?: string;         // Current execution stage
  details?: string;       // Long output (stdout, stack traces)
  context?: Record<string, any>; // Additional metadata
}

export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type LogType = 'general' | 'command';
```

### Log Levels

| Level | Usage | UI Color |
|-------|-------|----------|
| `info` | Normal progress messages | Blue |
| `success` | Completed steps | Green |
| `warning` | Non-fatal issues | Orange |
| `error` | Failures | Red |

### Log Types

| Type | Usage | UI Display |
|------|-------|------------|
| `general` | Status messages | Normal text |
| `command` | Shell commands, SQL | Monospace, collapsible |

## Usage in Services

Services (like `BackupService` or `RestoreService`) manage execution logs.

### Log Buffer Pattern

```typescript
class BackupRunner {
  private logs: LogEntry[] = [];
  private currentStage: string = 'Initialization';

  private log(
    message: string,
    level: LogLevel = 'info',
    type: LogType = 'general',
    details?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      level,
      type,
      stage: this.currentStage,
      details,
    };
    this.logs.push(entry);
    this.flushLogs(); // Periodic DB update
  }

  private setStage(stage: string) {
    this.currentStage = stage;
    this.log(`Starting ${stage}`, 'info');
  }
}
```

### Example Usage

```typescript
// Simple info message
this.log('Download started');

// Success with stage
this.setStage('Upload');
this.log('File uploaded successfully', 'success');

// Command with output
this.log(
  'Executing mysqldump',
  'info',
  'command',
  `mysqldump --host=db.example.com --user=backup mydb`
);

// Error with details
this.log(
  'Connection failed',
  'error',
  'general',
  error.stack
);

// Warning
this.log(
  'Slow connection detected',
  'warning',
  'general',
  `Latency: ${latencyMs}ms`
);
```

## Execution Stages

Standard stages used throughout the pipeline:

| Stage | Description |
|-------|-------------|
| `Initialization` | Loading configuration, resolving adapters |
| `Dump` | Creating database dump |
| `Compression` | Applying GZIP/Brotli |
| `Encryption` | Encrypting with vault key |
| `Upload` | Transferring to storage |
| `Retention` | Cleaning up old backups |
| `Completion` | Final cleanup, notifications |

For restore operations:

| Stage | Description |
|-------|-------------|
| `Initialization` | Loading configuration |
| `Download` | Fetching backup file |
| `Decryption` | Decrypting if encrypted |
| `Decompression` | Extracting if compressed |
| `Restore` | Applying to database |
| `Verification` | Optional integrity check |
| `Completion` | Cleanup |

## Log Persistence

### Flushing Strategy

Logs are buffered in memory and flushed to the database periodically:

```typescript
private async flushLogs() {
  // Debounced flush every 500ms
  await db.execution.update({
    where: { id: this.executionId },
    data: { logs: JSON.stringify(this.logs) },
  });
}
```

### Database Storage

```prisma
model Execution {
  id        String   @id
  logs      String   // JSON string of LogEntry[]
  // ...
}
```

### Retrieving Logs

```typescript
const execution = await db.execution.findUnique({
  where: { id: executionId },
});

const logs: LogEntry[] = JSON.parse(execution.logs || '[]');
```

## Frontend Rendering

### Stage Grouping

The UI groups logs by stage for better readability:

```tsx
function ExecutionLogs({ logs }: { logs: LogEntry[] }) {
  const grouped = groupBy(logs, 'stage');

  return (
    <div>
      {Object.entries(grouped).map(([stage, entries]) => (
        <StageSection key={stage} name={stage}>
          {entries.map((log) => (
            <LogLine key={log.timestamp} entry={log} />
          ))}
        </StageSection>
      ))}
    </div>
  );
}
```

### Command Collapsing

Command-type logs show the command itself, with expandable details:

```tsx
function LogLine({ entry }: { entry: LogEntry }) {
  if (entry.type === 'command') {
    return (
      <Collapsible>
        <CollapsibleTrigger>
          <code>{entry.message}</code>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre>{entry.details}</pre>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return <p className={levelStyles[entry.level]}>{entry.message}</p>;
}
```

## Live Progress

For real-time updates during execution:

```typescript
// Server: Update execution with progress
await db.execution.update({
  where: { id },
  data: {
    logs: JSON.stringify(logs),
    progress: {
      stage: currentStage,
      percent: calculatePercent(),
      message: lastLog.message,
    },
  },
});

// Client: Poll for updates
const { data } = useSWR(
  `/api/executions/${id}`,
  fetcher,
  { refreshInterval: 1000 }
);
```
