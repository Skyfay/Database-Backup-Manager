# Runner Pipeline

The Runner is the core engine that executes backups. It uses a **Pipeline Pattern** with discrete steps and a shared context.

## Architecture

```
runJob(jobId)
    │
    ▼
┌─────────────────────────────────────────┐
│           Queue Manager                  │
│   (FIFO queue, concurrency control)     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│           Runner Pipeline               │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Init   │─▶│  Dump   │─▶│ Upload  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                    │             │      │
│              ┌─────▼─────┐      │      │
│              │ Compress  │      │      │
│              └─────┬─────┘      │      │
│                    │            │      │
│              ┌─────▼─────┐      │      │
│              │  Encrypt  │──────┘      │
│              └───────────┘             │
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │Complete │◀─│Retention│              │
│  └─────────┘  └─────────┘              │
└─────────────────────────────────────────┘
```

## Runner Context

State flows through the pipeline via `RunnerContext`:

```typescript
// src/lib/runner/types.ts
interface RunnerContext {
  // Job configuration
  job: Job & { source: AdapterConfig; destination: AdapterConfig };
  execution: Execution;

  // Resolved adapters
  sourceAdapter: DatabaseAdapter;
  destinationAdapter: StorageAdapter;

  // Runtime state
  tempFile?: string;        // Local temporary file path
  remotePath?: string;      // Final storage path
  logs: string[];           // Execution logs
  status: "Running" | "Success" | "Failed";

  // Metadata
  metadata: {
    databases?: string[];
    size?: number;
    compressionRatio?: number;
  };

  // Encryption (if enabled)
  encryptionKey?: Buffer;
  iv?: Buffer;
  authTag?: Buffer;
}
```

## Pipeline Steps

### Step 1: Initialize (`01-initialize.ts`)

Creates the execution record and resolves adapters.

```typescript
export async function stepInitialize(ctx: RunnerContext): Promise<void> {
  // Update execution status
  await prisma.execution.update({
    where: { id: ctx.execution.id },
    data: { status: "Running", startedAt: new Date() },
  });

  // Decrypt source credentials
  ctx.job.source.config = decryptConfig(ctx.job.source.config);
  ctx.job.destination.config = decryptConfig(ctx.job.destination.config);

  // Resolve adapters
  ctx.sourceAdapter = registry.get(ctx.job.source.adapter) as DatabaseAdapter;
  ctx.destinationAdapter = registry.get(ctx.job.destination.adapter) as StorageAdapter;

  // Validate connections
  const sourceTest = await ctx.sourceAdapter.test(ctx.job.source.config);
  if (!sourceTest.success) {
    throw new Error(`Source connection failed: ${sourceTest.message}`);
  }

  ctx.logs.push("Initialization complete");
}
```

### Step 2: Dump (`02-dump.ts`)

Executes the database dump with optional compression and encryption.

```typescript
export async function stepDump(ctx: RunnerContext): Promise<void> {
  // Generate temp file path
  ctx.tempFile = path.join(os.tmpdir(), `backup-${Date.now()}.sql`);

  // Create processing pipeline
  const streams: Transform[] = [];

  // Add compression if enabled
  if (ctx.job.compression === "gzip") {
    streams.push(zlib.createGzip());
    ctx.tempFile += ".gz";
  } else if (ctx.job.compression === "brotli") {
    streams.push(zlib.createBrotliCompress());
    ctx.tempFile += ".br";
  }

  // Add encryption if enabled
  if (ctx.encryptionKey) {
    const { stream, iv, getAuthTag } = createEncryptionStream(ctx.encryptionKey);
    streams.push(stream);
    ctx.iv = iv;
    ctx.tempFile += ".enc";
    // Store authTag after stream ends
  }

  // Execute dump through pipeline
  const result = await ctx.sourceAdapter.dump(
    ctx.job.source.config,
    ctx.tempFile,
    streams
  );

  ctx.metadata.size = result.size;
  ctx.logs.push(...result.logs);
}
```

### Step 3: Upload (`03-upload.ts`)

Uploads the backup and metadata to storage.

```typescript
export async function stepUpload(ctx: RunnerContext): Promise<void> {
  // Generate remote path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extension = path.extname(ctx.tempFile!);
  ctx.remotePath = `${ctx.job.name}/${ctx.job.name}_${timestamp}${extension}`;

  // Upload backup file
  await ctx.destinationAdapter.upload(
    ctx.job.destination.config,
    ctx.tempFile!,
    ctx.remotePath
  );

  // Create and upload metadata
  const metadata: BackupMetadata = {
    jobId: ctx.job.id,
    jobName: ctx.job.name,
    sourceAdapter: ctx.job.source.adapter,
    timestamp: new Date().toISOString(),
    size: ctx.metadata.size,
    databases: ctx.metadata.databases,
    compression: ctx.job.compression,
    encrypted: !!ctx.encryptionKey,
    encryptionProfileId: ctx.job.encryptionProfileId,
    iv: ctx.iv?.toString("hex"),
    authTag: ctx.authTag?.toString("hex"),
  };

  await ctx.destinationAdapter.upload(
    ctx.job.destination.config,
    JSON.stringify(metadata, null, 2),
    `${ctx.remotePath}.meta.json`
  );

  ctx.logs.push(`Uploaded to: ${ctx.remotePath}`);
}
```

### Step 4: Completion (`04-completion.ts`)

Cleans up and finalizes the execution.

```typescript
export async function stepCompletion(ctx: RunnerContext): Promise<void> {
  // Clean up temp file
  if (ctx.tempFile) {
    await fs.unlink(ctx.tempFile).catch(() => {});
  }

  // Update execution record
  await prisma.execution.update({
    where: { id: ctx.execution.id },
    data: {
      status: ctx.status,
      completedAt: new Date(),
      size: ctx.metadata.size,
      logs: ctx.logs,
    },
  });

  // Send notifications
  if (ctx.job.notificationId) {
    await sendNotification(ctx);
  }

  ctx.logs.push("Backup completed successfully");
}
```

### Step 5: Retention (`05-retention.ts`)

Applies retention policy to delete old backups.

```typescript
export async function stepRetention(ctx: RunnerContext): Promise<void> {
  if (!ctx.job.retention) return;

  const config = ctx.job.retention as RetentionConfig;

  // List existing backups
  const files = await ctx.destinationAdapter.list(
    ctx.job.destination.config,
    ctx.job.name // folder path
  );

  // Filter to only this job's backups
  const backups = files.filter(f =>
    f.name.startsWith(ctx.job.name) &&
    !f.name.endsWith(".meta.json")
  );

  // Apply retention algorithm
  const result = await RetentionService.applyRetention(backups, config);

  // Delete old backups
  for (const file of result.delete) {
    // Skip locked files
    if (file.locked) continue;

    await ctx.destinationAdapter.delete(
      ctx.job.destination.config,
      `${ctx.job.name}/${file.name}`
    );

    // Delete metadata too
    await ctx.destinationAdapter.delete(
      ctx.job.destination.config,
      `${ctx.job.name}/${file.name}.meta.json`
    ).catch(() => {});
  }

  ctx.logs.push(`Retention: Kept ${result.keep.length}, deleted ${result.delete.length}`);
}
```

## Queue Manager

Controls concurrent backup execution:

```typescript
// src/lib/queue-manager.ts
class QueueManager {
  private queue: string[] = [];
  private running = 0;

  async enqueue(executionId: string): Promise<void> {
    this.queue.push(executionId);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    const maxConcurrent = await this.getMaxConcurrent();

    while (this.queue.length > 0 && this.running < maxConcurrent) {
      const executionId = this.queue.shift()!;
      this.running++;

      // Run in background (don't await)
      this.executeBackup(executionId)
        .finally(() => {
          this.running--;
          this.processQueue();
        });
    }
  }

  private async getMaxConcurrent(): Promise<number> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "maxConcurrentJobs" },
    });
    return setting?.value ? parseInt(setting.value) : 1;
  }
}
```

## Error Handling

The runner wraps all steps in error handling:

```typescript
// src/lib/runner.ts
export async function performExecution(executionId: string): Promise<void> {
  const ctx = await createContext(executionId);

  try {
    await stepInitialize(ctx);
    await stepDump(ctx);
    await stepUpload(ctx);
    ctx.status = "Success";
  } catch (error) {
    ctx.status = "Failed";
    ctx.logs.push(`Error: ${error instanceof Error ? error.message : error}`);
    throw error;
  } finally {
    await stepCompletion(ctx);
    await stepRetention(ctx).catch(e => {
      console.error("Retention failed:", e);
    });
  }
}
```

## Streaming Architecture

For large databases, the runner uses streams to avoid loading everything into memory:

```typescript
// Dump → Compress → Encrypt → Upload
const dumpStream = adapter.createDumpStream(config);
const gzipStream = zlib.createGzip();
const encryptStream = createEncryptionStream(key);
const uploadStream = storage.createUploadStream(path);

pipeline(
  dumpStream,
  gzipStream,
  encryptStream,
  uploadStream
);
```

## Live Progress

The runner broadcasts progress via polling:

```typescript
// Update progress during dump
async function updateProgress(executionId: string, bytes: number) {
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      progress: bytes,
      updatedAt: new Date()
    },
  });
}
```

The UI polls for updates:

```typescript
// Frontend polling
useEffect(() => {
  const interval = setInterval(async () => {
    const execution = await fetchExecution(id);
    setProgress(execution.progress);
  }, 1000);

  return () => clearInterval(interval);
}, [id]);
```

## Related Documentation

- [Service Layer](/developer-guide/core/services)
- [Retention System](/developer-guide/advanced/retention)
- [Encryption Pipeline](/developer-guide/advanced/encryption)
