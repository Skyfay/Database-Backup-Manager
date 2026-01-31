# Retention System

The Retention System automatically manages backup storage by implementing smart rotation policies based on the Grandfather-Father-Son (GVS) algorithm.

## Overview

DBackup supports three retention modes:

| Mode | Description |
| :--- | :--- |
| **None** | Keep all backups (no deletion) |
| **Simple** | Keep the last N backups |
| **Smart (GVS)** | Grandfather-Father-Son strategy |

## Grandfather-Father-Son (GVS)

The GVS algorithm keeps backups at decreasing frequencies as they age:

```
Today ←──── Daily ────→ Weekly ────→ Monthly ────→ Yearly
      ←─── 7 days ───→ 4 weeks ───→ 12 months ──→ ∞
```

### Example Configuration

```json
{
  "mode": "SMART",
  "smart": {
    "daily": 7,     // Keep last 7 daily backups
    "weekly": 4,    // Keep last 4 weekly backups
    "monthly": 6,   // Keep last 6 monthly backups
    "yearly": 2     // Keep last 2 yearly backups
  }
}
```

### How Selection Works

1. **Daily**: Most recent backup from each of the last N days
2. **Weekly**: Most recent backup from each of the last N weeks
3. **Monthly**: Most recent backup from each of the last N months
4. **Yearly**: Most recent backup from each of the last N years

A single backup can satisfy multiple buckets. For example, January 1st's backup could be:
- Today's daily backup
- This week's weekly backup
- This month's monthly backup
- This year's yearly backup

## Data Model

### Job Configuration

```prisma
model Job {
  // ...
  retention Json @default("{}")
}
```

### TypeScript Interface

```typescript
// src/lib/core/retention.ts
export type RetentionMode = "NONE" | "SIMPLE" | "SMART";

export interface RetentionConfiguration {
  mode: RetentionMode;
  simple?: {
    keepCount: number;
  };
  smart?: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
}
```

## RetentionService Implementation

The core logic lives in `src/services/retention-service.ts`:

```typescript
export const RetentionService = {
  calculateRetention(
    files: FileInfo[],
    config: RetentionConfiguration
  ): RetentionResult {
    // 1. Separate locked files (always kept)
    const { locked, unlocked } = this.separateLocked(files);

    // 2. Sort by date (newest first)
    const sorted = unlocked.sort(
      (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()
    );

    // 3. Apply policy
    let keep: FileInfo[];

    switch (config.mode) {
      case "NONE":
        keep = sorted;
        break;
      case "SIMPLE":
        keep = sorted.slice(0, config.simple!.keepCount);
        break;
      case "SMART":
        keep = this.applyGVS(sorted, config.smart!);
        break;
    }

    // 4. Calculate deletions
    const keepSet = new Set(keep.map(f => f.name));
    const toDelete = sorted.filter(f => !keepSet.has(f.name));

    return {
      keep: [...locked, ...keep],
      delete: toDelete,
    };
  },

  applyGVS(files: FileInfo[], config: SmartConfig): FileInfo[] {
    const keep = new Set<string>();

    // Daily buckets
    this.selectForPeriod(files, config.daily, "day", keep);

    // Weekly buckets
    this.selectForPeriod(files, config.weekly, "week", keep);

    // Monthly buckets
    this.selectForPeriod(files, config.monthly, "month", keep);

    // Yearly buckets
    this.selectForPeriod(files, config.yearly, "year", keep);

    return files.filter(f => keep.has(f.name));
  },

  selectForPeriod(
    files: FileInfo[],
    count: number,
    period: "day" | "week" | "month" | "year",
    keep: Set<string>
  ): void {
    const buckets = new Map<string, FileInfo>();

    for (const file of files) {
      const key = this.getBucketKey(file.modifiedAt, period);

      // Keep newest file per bucket
      if (!buckets.has(key)) {
        buckets.set(key, file);
      }
    }

    // Select most recent N buckets
    const sorted = [...buckets.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, count);

    for (const [, file] of sorted) {
      keep.add(file.name);
    }
  },

  getBucketKey(date: Date, period: string): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const week = getWeekNumber(date);
    const day = date.getDate();

    switch (period) {
      case "day":
        return `${year}-${month}-${day}`;
      case "week":
        return `${year}-W${week}`;
      case "month":
        return `${year}-${month}`;
      case "year":
        return `${year}`;
    }
  },
};
```

## Backup Locking

Users can lock important backups to prevent automatic deletion.

### How It Works

1. Lock status is stored in the `.meta.json` sidecar file:
   ```json
   {
     "jobName": "daily-backup",
     "locked": true
   }
   ```

2. Locked files are excluded from retention calculation

3. They don't count against retention limits (e.g., if you keep 5 and have 2 locked, you end up with 7)

### Toggle Lock Flow

```typescript
async function toggleLock(storagePath: string, fileName: string) {
  // 1. Read current metadata
  const metaPath = `${storagePath}/${fileName}.meta.json`;
  const meta = JSON.parse(await adapter.read(config, metaPath));

  // 2. Toggle lock status
  meta.locked = !meta.locked;

  // 3. Write back
  await adapter.upload(config, JSON.stringify(meta), metaPath);
}
```

## Pipeline Integration

Retention runs as the final step of the backup pipeline:

```typescript
// src/lib/runner/steps/05-retention.ts
export async function stepRetention(ctx: RunnerContext): Promise<void> {
  const config = ctx.job.retention as RetentionConfiguration;

  // Skip if no retention configured
  if (!config || config.mode === "NONE") {
    ctx.logs.push("Retention: Skipped (no policy)");
    return;
  }

  // 1. List existing backups
  const files = await ctx.destinationAdapter.list(
    ctx.job.destination.config,
    ctx.job.name
  );

  // 2. Filter to backup files only (exclude metadata)
  const backups = files.filter(f => !f.name.endsWith(".meta.json"));

  // 3. Enrich with lock status
  const enriched = await Promise.all(
    backups.map(async (file) => {
      try {
        const meta = await ctx.destinationAdapter.read(
          ctx.job.destination.config,
          `${ctx.job.name}/${file.name}.meta.json`
        );
        const parsed = JSON.parse(meta);
        return { ...file, locked: parsed.locked || false };
      } catch {
        return { ...file, locked: false };
      }
    })
  );

  // 4. Calculate retention
  const result = RetentionService.calculateRetention(enriched, config);

  // 5. Delete old backups
  for (const file of result.delete) {
    await ctx.destinationAdapter.delete(
      ctx.job.destination.config,
      `${ctx.job.name}/${file.name}`
    );

    // Also delete metadata
    await ctx.destinationAdapter.delete(
      ctx.job.destination.config,
      `${ctx.job.name}/${file.name}.meta.json`
    ).catch(() => {}); // Ignore if not exists
  }

  ctx.logs.push(
    `Retention: Kept ${result.keep.length}, deleted ${result.delete.length}`
  );
}
```

## Error Handling

- **Metadata read failures**: File treated as unlocked
- **Delete failures**: Logged but don't fail the backup job
- **Lock toggle failures**: Surfaced to user immediately

## Testing

```typescript
// tests/unit/retention-service.test.ts
describe("RetentionService", () => {
  it("keeps correct number of daily backups", () => {
    const files = generateDailyBackups(30); // 30 days of backups
    const config = { mode: "SMART", smart: { daily: 7 } };

    const result = RetentionService.calculateRetention(files, config);

    expect(result.keep).toHaveLength(7);
    expect(result.delete).toHaveLength(23);
  });

  it("never deletes locked files", () => {
    const files = [
      { name: "backup-1", locked: true },
      { name: "backup-2", locked: false },
    ];
    const config = { mode: "SIMPLE", simple: { keepCount: 1 } };

    const result = RetentionService.calculateRetention(files, config);

    expect(result.keep).toContainEqual(
      expect.objectContaining({ name: "backup-1" })
    );
  });
});
```

## Adapter Requirements

For retention to work, storage adapters must implement:

| Method | Required For |
| :--- | :--- |
| `list()` | Discover existing backups |
| `read()` | Check lock status in metadata |
| `delete()` | Remove old backups |
| `upload()` | Toggle lock in metadata |

## Related Documentation

- [Runner Pipeline](/developer-guide/core/runner)
- [Storage Adapters](/developer-guide/adapters/storage)
- [Job Configuration](/user-guide/jobs/)
