# Adapter System

DBackup uses a **Plugin/Adapter Architecture**. The core logic doesn't know about specific technologies—it only knows about interfaces.

## Overview

```
src/lib/adapters/
├── definitions.ts      # Zod schemas for all adapters
├── index.ts           # Registration
├── database/          # MySQL, PostgreSQL, MongoDB, etc.
│   └── common/        # Shared utilities (tar-utils.ts)
├── storage/           # Local, S3, SFTP, etc.
├── notification/      # Discord, Email, etc.
└── oidc/              # SSO providers (Authentik, PocketID, Generic)
```

## Adapter Types

### DatabaseAdapter

Handles database dump and restore operations.

```typescript
interface DatabaseAdapter {
  id: string;                    // Unique identifier
  type: "database";
  name: string;                  // Display name
  configSchema: ZodSchema;       // Configuration schema

  dump(
    config: unknown,
    destinationPath: string,
    onLog?: (msg: string, level?: LogLevel, type?: LogType, details?: string) => void,
    onProgress?: (percentage: number) => void
  ): Promise<BackupResult>;

  restore(
    config: unknown,
    sourcePath: string,
    onLog?: (msg: string, level?: LogLevel, type?: LogType, details?: string) => void,
    onProgress?: (percentage: number) => void
  ): Promise<BackupResult>;

  test(config: unknown): Promise<TestResult>;
  getDatabases?(config: unknown): Promise<string[]>;
  prepareRestore?(config: unknown, databases: string[]): Promise<void>;
  analyzeDump?(sourcePath: string): Promise<string[]>;
}
```

### StorageAdapter

Handles file storage operations.

```typescript
interface StorageAdapter {
  id: string;
  type: "storage";
  name: string;
  configSchema: ZodSchema;

  upload(
    config: unknown,
    localPath: string,
    remotePath: string,
    onProgress?: (percent: number) => void,
    onLog?: (msg: string, level?: LogLevel, type?: LogType, details?: string) => void
  ): Promise<boolean>;

  download(
    config: unknown,
    remotePath: string,
    localPath: string,
    onProgress?: (processed: number, total: number) => void,
    onLog?: (msg: string, level?: LogLevel, type?: LogType, details?: string) => void
  ): Promise<boolean>;

  list(config: unknown, path: string): Promise<FileInfo[]>;
  delete(config: unknown, path: string): Promise<boolean>;
  test(config: unknown): Promise<TestResult>;
  read?(config: unknown, path: string): Promise<string | null>;
}
```

### NotificationAdapter

Handles sending notifications.

```typescript
interface NotificationAdapter {
  id: string;
  type: "notification";
  name: string;
  configSchema: ZodSchema;

  send(
    config: unknown,
    message: string,
    context?: any
  ): Promise<boolean>;
  test(config: unknown): Promise<TestResult>;
}
```

## Creating an Adapter

### Step 1: Define the Schema

Add a Zod schema in `src/lib/adapters/definitions.ts`:

```typescript
export const SQLiteSchema = z.object({
  path: z.string().min(1, "Database path is required"),
  password: z.string().optional().describe("Encryption password"),
});

// Add to the adapter definitions
export const adapterDefinitions = {
  // ... existing
  sqlite: {
    name: "SQLite",
    schema: SQLiteSchema,
    type: "database" as const,
    icon: "sqlite",
  },
};
```

### Step 2: Implement the Adapter

Create `src/lib/adapters/database/sqlite.ts`:

```typescript
import { DatabaseAdapter, BackupResult, TestResult } from "@/lib/core/interfaces";
import { SQLiteSchema } from "../definitions";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

export const SQLiteAdapter: DatabaseAdapter = {
  id: "sqlite",
  type: "database",
  name: "SQLite",
  configSchema: SQLiteSchema,

  async dump(config, destinationPath): Promise<BackupResult> {
    const validated = SQLiteSchema.parse(config);
    const logs: string[] = [];

    try {
      // Copy database file (SQLite is just a file)
      await fs.copyFile(validated.path, destinationPath);

      const stats = await fs.stat(destinationPath);
      logs.push(`Dumped SQLite database: ${validated.path}`);

      return {
        success: true,
        size: stats.size,
        logs,
      };
    } catch (error) {
      return {
        success: false,
        size: 0,
        logs: [...logs, `Error: ${error}`],
      };
    }
  },

  async restore(config, sourcePath): Promise<BackupResult> {
    const validated = SQLiteSchema.parse(config);

    await fs.copyFile(sourcePath, validated.path);

    return {
      success: true,
      size: 0,
      logs: ["Database restored successfully"],
    };
  },

  async test(config): Promise<TestResult> {
    const validated = SQLiteSchema.parse(config);

    try {
      await fs.access(validated.path);
      return {
        success: true,
        message: "Database file accessible",
      };
    } catch {
      return {
        success: false,
        message: "Database file not found",
      };
    }
  },

  async getDatabases(config): Promise<string[]> {
    const validated = SQLiteSchema.parse(config);
    // SQLite is single-database, return filename
    return [validated.path.split("/").pop() || "database.db"];
  },
};
```

### Step 3: Register the Adapter

Add to `src/lib/adapters/index.ts`:

```typescript
import { SQLiteAdapter } from "./database/sqlite";

export function registerAdapters(registry: AdapterRegistry) {
  // ... existing adapters
  registry.register(SQLiteAdapter);
}
```

### Step 4: Export Types

If needed, add type exports in `src/lib/adapters/database/index.ts`:

```typescript
export { SQLiteAdapter } from "./sqlite";
```

## Adapter Registry

The registry manages all available adapters:

```typescript
// src/lib/core/registry.ts
class AdapterRegistry {
  private adapters = new Map<string, Adapter>();

  register(adapter: Adapter) {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): Adapter | undefined {
    return this.adapters.get(id);
  }

  getByType(type: "database" | "storage" | "notification"): Adapter[] {
    return [...this.adapters.values()].filter(a => a.type === type);
  }
}

export const registry = new AdapterRegistry();
```

Usage:

```typescript
import { registry } from "@/lib/core/registry";

// Get specific adapter
const mysqlAdapter = registry.get("mysql");

// Get all database adapters
const dbAdapters = registry.getByType("database");
```

## Configuration Schemas

### Schema Best Practices

Use Zod features for better UI generation:

```typescript
export const MySQLSchema = z.object({
  host: z.string()
    .default("localhost")
    .describe("Database server hostname"),

  port: z.coerce.number()
    .default(3306)
    .describe("Server port"),

  username: z.string()
    .min(1, "Username is required"),

  password: z.string()
    .min(1, "Password is required")
    .describe("Will be encrypted at rest"),

  database: z.string()
    .optional()
    .describe("Leave empty for all databases"),
});
```

### Encrypted Fields

Fields named `password`, `secret`, `key`, or `token` are automatically encrypted:

```typescript
// src/lib/crypto.ts
export function encryptConfig(config: Record<string, unknown>) {
  const encrypted = { ...config };

  for (const key of SENSITIVE_FIELDS) {
    if (encrypted[key]) {
      encrypted[key] = encrypt(encrypted[key] as string);
    }
  }

  return encrypted;
}
```

## Testing Adapters

### BackupMetadata Interface

The `BackupMetadata` interface (defined in `src/lib/core/interfaces.ts`) is used for the `.meta.json` sidecar files:

```typescript
interface BackupMetadata {
  jobId: string;
  jobName: string;
  sourceAdapter: string;
  timestamp: string;
  size: number;
  databases?: string[];
  compression?: string;
  encrypted?: boolean;
  encryptionProfileId?: string;
  iv?: string;
  authTag?: string;
  checksum?: string;       // SHA-256 hash of the final backup file (added in v0.9.5)
  multiDb?: boolean;
  locked?: boolean;
}
```

> **Note:** The `checksum` field contains the SHA-256 hash of the final backup file (after compression and encryption). It is calculated during the upload step and used for post-upload verification, pre-restore verification, and periodic integrity checks.

### Unit Tests

```typescript
// tests/unit/adapters/sqlite.test.ts
import { SQLiteAdapter } from "@/lib/adapters/database/sqlite";

describe("SQLiteAdapter", () => {
  const testConfig = {
    path: "/tmp/test.db",
  };

  it("should validate config", () => {
    const result = SQLiteAdapter.configSchema.safeParse(testConfig);
    expect(result.success).toBe(true);
  });

  it("should reject invalid config", () => {
    const result = SQLiteAdapter.configSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

```typescript
// tests/integration/adapters/sqlite.test.ts
import { SQLiteAdapter } from "@/lib/adapters/database/sqlite";
import fs from "fs/promises";

describe("SQLiteAdapter Integration", () => {
  const testDbPath = "/tmp/test-integration.db";
  const backupPath = "/tmp/test-backup.db";

  beforeAll(async () => {
    // Create test database
    await fs.writeFile(testDbPath, "test data");
  });

  it("should dump database", async () => {
    const result = await SQLiteAdapter.dump(
      { path: testDbPath },
      backupPath
    );

    expect(result.success).toBe(true);
    expect(result.size).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await fs.unlink(testDbPath).catch(() => {});
    await fs.unlink(backupPath).catch(() => {});
  });
});
```

## UI Integration

The UI automatically generates forms based on the Zod schema:

```tsx
// src/components/adapter-form.tsx
function AdapterForm({ adapterId }: { adapterId: string }) {
  const adapter = registry.get(adapterId);
  const schema = adapter?.configSchema;

  // Auto-generate form fields from schema
  return (
    <Form schema={schema}>
      {/* Fields are generated automatically */}
    </Form>
  );
}
```

## Related Documentation

- [Database Adapters](/developer-guide/adapters/database)
- [Storage Adapters](/developer-guide/adapters/storage)
- [Notification Adapters](/developer-guide/adapters/notification)
