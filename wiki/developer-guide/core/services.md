# Service Layer

The Service Layer contains all business logic in DBackup. Server Actions and API routes delegate to services—they never contain business logic themselves.

## Overview

```
src/services/
├── job-service.ts        # CRUD for backup jobs
├── backup-service.ts     # Trigger backups
├── restore-service.ts    # Restore orchestration
├── retention-service.ts  # GVS algorithm
├── encryption-service.ts # Encryption profiles
├── user-service.ts       # User management
└── oidc-provider-service.ts # SSO configuration
```

## Architecture Principle

**Server Actions are thin wrappers:**

```typescript
// src/app/actions/job.ts
"use server";

export async function createJob(data: JobInput) {
  // 1. Check permissions
  await checkPermission(PERMISSIONS.JOBS.WRITE);

  // 2. Validate input
  const validated = JobSchema.parse(data);

  // 3. Delegate to service
  const result = await JobService.create(validated);

  // 4. Revalidate cache
  revalidatePath("/dashboard/jobs");

  return result;
}
```

## Key Services

### JobService

Manages backup job configuration.

```typescript
// src/services/job-service.ts
export const JobService = {
  async getAll() {
    return prisma.job.findMany({
      include: { source: true, destination: true }
    });
  },

  async create(data: JobInput) {
    return prisma.job.create({ data });
  },

  async update(id: string, data: Partial<JobInput>) {
    return prisma.job.update({
      where: { id },
      data
    });
  },

  async delete(id: string) {
    return prisma.job.delete({ where: { id } });
  }
};
```

### BackupService

Triggers backup execution.

```typescript
// src/services/backup-service.ts
export const BackupService = {
  async runJob(jobId: string) {
    // Create pending execution
    const execution = await prisma.execution.create({
      data: {
        jobId,
        status: "Pending",
        type: "Backup"
      }
    });

    // Add to queue
    await queueManager.enqueue(execution.id);

    return execution;
  }
};
```

### RestoreService

Orchestrates database restoration.

```typescript
// src/services/restore-service.ts
export const RestoreService = {
  async restore(input: RestoreInput) {
    // 1. Pre-flight checks
    const checks = await this.prepareRestore(input);
    if (!checks.success) throw new Error(checks.error);

    // 2. Create execution record
    const execution = await prisma.execution.create({
      data: {
        type: "Restore",
        status: "Running"
      }
    });

    // 3. Run async (background)
    this.runRestoreProcess(execution.id, input);

    return execution;
  }
};
```

### RetentionService

Implements the Grandfather-Father-Son (GVS) retention algorithm.

```typescript
// src/services/retention-service.ts
export const RetentionService = {
  async applyRetention(
    files: FileInfo[],
    config: RetentionConfig
  ): Promise<RetentionResult> {
    const toKeep = new Set<string>();

    // Keep daily backups (last N days)
    this.selectDaily(files, config.daily, toKeep);

    // Keep weekly backups (last N weeks)
    this.selectWeekly(files, config.weekly, toKeep);

    // Keep monthly backups (last N months)
    this.selectMonthly(files, config.monthly, toKeep);

    // Everything not in toKeep is marked for deletion
    return {
      keep: files.filter(f => toKeep.has(f.name)),
      delete: files.filter(f => !toKeep.has(f.name))
    };
  }
};
```

### EncryptionService

Manages encryption profiles and key generation.

```typescript
// src/services/encryption-service.ts
export const EncryptionService = {
  async createProfile(name: string) {
    // Generate 32-byte random key
    const rawKey = crypto.randomBytes(32);

    // Encrypt with system ENCRYPTION_KEY
    const encryptedKey = encrypt(rawKey.toString("hex"));

    return prisma.encryptionProfile.create({
      data: { name, key: encryptedKey }
    });
  },

  async getDecryptedKey(profileId: string) {
    const profile = await prisma.encryptionProfile.findUnique({
      where: { id: profileId }
    });

    return decrypt(profile.key);
  }
};
```

## Response Format

Services return a consistent format:

```typescript
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

Example usage:

```typescript
async function createJob(data: JobInput): Promise<ServiceResult<Job>> {
  try {
    const job = await prisma.job.create({ data });
    return { success: true, data: job };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

## Error Handling

Services catch errors and return structured responses:

```typescript
export const JobService = {
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      // Check for running executions
      const running = await prisma.execution.findFirst({
        where: { jobId: id, status: "Running" }
      });

      if (running) {
        return {
          success: false,
          error: "Cannot delete job with running execution"
        };
      }

      await prisma.job.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: "Failed to delete job"
      };
    }
  }
};
```

## Testing Services

Services are easy to unit test:

```typescript
// tests/services/retention-service.test.ts
describe("RetentionService", () => {
  it("keeps daily backups", async () => {
    const files = generateTestFiles(30);
    const config = { daily: 7, weekly: 4, monthly: 3 };

    const result = await RetentionService.applyRetention(files, config);

    expect(result.keep.length).toBeLessThanOrEqual(14); // 7+4+3
    expect(result.delete.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

### 1. Keep Services Focused

Each service handles one domain:

- `JobService` - Job CRUD only
- `BackupService` - Backup execution only
- Don't mix concerns

### 2. Use Transactions

For multi-step operations:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.job.delete({ where: { id } });
  await tx.execution.deleteMany({ where: { jobId: id } });
});
```

### 3. Validate Early

Validate input at the service boundary:

```typescript
async create(data: unknown) {
  const validated = JobSchema.parse(data);
  return prisma.job.create({ data: validated });
}
```

### 4. Log Important Operations

```typescript
console.log(`[JobService] Created job: ${job.id}`);
```

## Related Documentation

- [Adapter System](/developer-guide/core/adapters)
- [Runner Pipeline](/developer-guide/core/runner)
- [Permission System](/developer-guide/advanced/permissions)
