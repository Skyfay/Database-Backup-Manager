# Database Adapter Development Guide

This guide describes how to implement a new `DatabaseAdapter` for the Database Backup Manager.
To ensure full compatibility with features like **Live Progress**, **Streaming**, and **Selective Restore**, please follow these guidelines strictly.

## 1. File Structure & The Dialect Pattern

We use the **Dialect Pattern** to support multiple database versions (e.g., MySQL 5.7 vs 8.0 or MariaDB) without duplicating core logic.

**Recommended Structure:**
```
src/lib/adapters/database/<adapter-id>/
├── index.ts          # Exports functionality as DatabaseAdapter object
├── connection.ts     # Connection testing (must return version!)
├── dump.ts           # The dump() implementation (uses Dialect)
├── restore.ts        # The restore() implementation (uses Dialect)
└── dialects/         # Folder for version-specific logic
    ├── index.ts      # Dialect Factory (getDialect)
    ├── base.ts       # Abstract Base Class
    └── v1-variant.ts # Specific implementations
```

## 2. The Dialect Interface

Instead of hardcoding CLI flags in `dump.ts` or `restore.ts`, delegate this to a Dialect class.

**Define a Dialect:**
```typescript
// src/lib/adapters/database/common/dialect.ts (Reference)
export interface DatabaseDialect {
    getDumpArgs(config: any, databases: string[]): string[];
    getRestoreArgs(config: any, targetDatabase?: string): string[];
    getConnectionArgs(config: any): string[];
}
```

**Using the Dialect in `dump.ts`:**
```typescript
import { getDialect } from "./dialects";

export async function dump(config: any, path: string, ...) {
    // 1. Get the correct dialect based on config and detected version
    const dialect = getDialect(config.type, config.detectedVersion);

    // 2. Get arguments
    const args = dialect.getDumpArgs(config, databases);

    // 3. Spawn process
    const proc = spawn('tool', args, ...);
}
```

## 3. Version Detection

Your adapter's `test` function should detect the database version to allow the system to choose the correct dialect.

**`connection.ts` Example:**
```typescript
export async function test(config: any) {
    // 1. Ping
    await execFileAsync('db_cli', ['ping', ...]);

    // 2. Fetch Version
    const { stdout } = await execFileAsync('db_cli', ['version', ...]);

    return {
        success: true,
        message: "Connected",
        version: stdout.trim() // e.g. "8.0.32"
    };
}
```

## 4. Implementing `restore` (Critical for UX)

The `restore` method is the most complex part because it drives the "Live Activity" UI.

### ❌ DON'TS (Bad Practices)
- **Do NOT use `fs.readFileSync`**: Never load the whole dump into RAM. It will crash on large databases.
- **Do NOT use simple `exec`**: `exec('mysql < file.sql')` buffers all output and often hides progress.
- **Do NOT ignore `onProgress`**: The UI will appear frozen without this.

### ✅ DOs (Best Practices)

#### A. Streaming & Progress
You **must** use Node.js Streams (`createReadStream`, `pipeline` or `spawn` stdio pipes).
This ensures the backup is processed only as fast as the database can accept it.

**Pattern for piping with Progress:**
```typescript
async restore(config, sourcePath, onLog, onProgress) {
    const totalSize = (await fs.stat(sourcePath)).size;
    let processed = 0;

    // 1. Create Source Stream
    const fileStream = createReadStream(sourcePath);

    // 2. Add Progress Listener
    fileStream.on('data', (chunk) => {
        processed += chunk.length;
        if (onProgress) {
            const percent = Math.round((processed / totalSize) * 100);
            onProgress(percent);
        }
    });

    // 3. Spawn DB Process (using Dialect args)
    const dialect = getDialect(config.type, config.detectedVersion);
    const args = dialect.getRestoreArgs(config);

    const proc = spawn('db_cli', args, {
        stdio: ['pipe', 'pipe', 'pipe'] // Pipe stdin!
    });

    // 4. Connect streams
    // File -> DB Process
    fileStream.pipe(proc.stdin);

    // 5. Handle Logs
    proc.stderr.on('data', d => onLog?.(d.toString()));
}
```

#### B. Live Logging
- Redirect `stderr` (and `stdout` if relevant) from your spawned process to the `onLog` callback.
- Clean up sensitive data (passwords) from logs before emitting.

#### C. Selective Restore / Mapping (Advanced)
If your adapter supports renaming databases or restoring only specific ones from a multi-DB dump:
- You need a **Transform Stream** between the file and the database process.
- Use this stream to parse SQL on-the-fly (e.g., checking `CREATE DATABASE` lines).
- **Warning**: String manipulation in buffers is tricky. Ensure you handle chunk boundaries or use a line-aware stream reader properly.

## 5. Implementing `dump`

### Critical for Live Progress
The Backup Manager uses a "File Watcher" technique to monitor the dump progress in real-time.
1.  **Streaming is Mandatory**: You **MUST** stream the output of your database tool directly to the `destinationPath` file.
    - ✅ **Good**: `spawn('mysqldump', ...).stdout.pipe(createWriteStream(destPath))`
    - ❌ **Bad**: Buffering output in memory and writing it with `fs.writeFile` at the end. (This causes the UI to show 0MB until the job finishes).

### Method Signature
```typescript
async dump(
  config: any,
  destinationPath: string,
  onLog?: (msg: string) => void,
  onProgress?: (percent: number) => void // Optional, if tool provides %
): Promise<BackupResult>
```

### Best Practices
- **Standard Output**: Most tools (like `pg_dump`, `mongodump` --archive) write to stdout. Pipe this directly to a file write stream.
- **Error Handling**: Listen to `stderr` and pass it to `onLog`. If the process exit code is non-zero, throw an error or return `{ success: false }`.
- **Empty File Check**: After the process finishes, check `fs.stat(destinationPath).size`. If it's 0 bytes, the dump likely failed silently (e.g., authentication error).

## 6. `analyzeDump` (Optional)
To support the "Selective Restore" UI, your adapter can implement `analyzeDump`.
- **Performance**: Do NOT read the whole file.
- Use tools like `grep` (via `spawn`) to quickly find `CREATE DATABASE` statements in multi-gigabyte files without generic parsing.

## 7. Zod Schema
- Define a strict Zod schema for your configuration (Host, Port, User, Password).
- Export this schema for the UI to generate the form automatically.
