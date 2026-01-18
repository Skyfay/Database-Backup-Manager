# Implementation Plan: Backup Compression & Progress Tracking

## 1. Overview
We will introduce a configurable **Compression Layer** into the Backup Runner pipeline.
The pipeline data flow will be updated to:
`Source (Dump)` -> `Compression (Gzip/Brotli)` -> `Encryption (AES-256)` -> `Destination (Storage)`.

Currently, we only have `Source` -> `Encryption?` -> `Destination`.

## 2. Database & Schema Changes
We need to store the compression configuration in the `Job` model and the execution metadata.

### `schema.prisma`
```prisma
model Job {
  // ... existing fields
  compression     String    @default("NONE") // Enum: "NONE", "GZIP", "BROTLI"
  // ...
}

// Execution Metadata (JSON) will store:
// {
//   "compression": "GZIP",
//   "encryption": { "enabled": true, ... }
// }
```

## 3. UI Implementation
### Job Editor (`src/components/dashboard/jobs/job-form.tsx`)
- Add a **"Compression"** configuration section.
- Dropdown:
  - **None** (Fastest, largest size)
  - **Gzip** (Standard, good compatibility)
  - **Brotli** (Best compression, slightly higher CPU usage)

## 4. Core Logic & Streams
We need a standardized way to generate Transform Streams based on config.

### New Utility: `src/lib/compression.ts`
```typescript
import { createGzip, createBrotliCompress, createUnzip, createBrotliDecompress } from 'zlib';

export function getCompressionStream(type: string) {
    switch (type) {
        case 'GZIP': return createGzip();
        case 'BROTLI': return createBrotliCompress();
        default: return null; // PassThrough if needed, or handle in runner
    }
}

export function getDecompressionStream(type: string) {
    // ... reverse logic
}
```

## 5. Runner Pipeline Update (`src/lib/runner/pipeline.ts`)
The Runner needs to construct the pipeline dynamically.

**Current Logic:**
```typescript
pipeline(sourceStream, encryptionStream?, destinationStream)
```

**New Logic:**
```typescript
const streams = [sourceStream];

// 1. Compression Step
if (job.compression !== 'NONE') {
    streams.push(getCompressionStream(job.compression));
}

// 2. Encryption Step
if (job.encryptionProfile) {
    streams.push(getEncryptionStream(key));
}

// 3. Progress Tracking Step (See Section 7)
streams.push(createProgressMonitorStream(job.id));

// 4. Destination
streams.push(destinationStream);

await pipeline(streams);
```

**File Extensions:**
The runner must recognize the extensions to append:
- MySQL: `.sql`
- Gzip: `.sql.gz`
- Encrypted: `.sql.gz.enc`

## 6. Restore Service Update
The Restore Service must handle the reverse order.

1. **Download/Read**: Stream from Storage.
2. **Decrypt**: If `.enc` or metadata says encrypted -> AES Decrypt.
3. **Decompress**: If `.gz`/`.br` or metadata says compressed -> Gunzip/BrotliDecompress.
4. **Import**: Stream to Database Adapter.

*Note: The metadata sidecar (`.meta.json`) is the source of truth for the restore sequence.*

## 7. Progress Tracking System
Since we are streaming data (often without knowing total size from `mysqldump`), "Progress %" is hard, but "Processed Size" is easy.

### Architecture
1. **Server-Side**:
   - Create a `PassThrough` stream that counts bytes passing through.
   - On every chunk (or throttle every 500ms), update a cache (Node variable or lightweight DB update) with `processedBytes`.
   - Update `Execution` table with `currentStep` (e.g., "Compressing", "Uploading").

2. **Client-Side (UI)**:
   - Polling (SWR/React Query) every 2 seconds to `/api/executions/:id/status`.
   - Show a Progress Bar.
     - If `totalSize` is known (File Backup): Show %.
     - If `totalSize` is unknown (DB Dump): Show "35 MB uploaded..." (Indeterminate/Pulse bar).

### API Endpoint (`/api/executions/[id]/status`)
Returns:
```json
{
  "status": "Running",
  "step": "UPLOADING", // ENCRYPTING, DUMPING
  "processedBytes": 4502150,
  "elapsedTime": 12
}
```

## 8. Implementation Steps (Order of Operations)
1.  [ ] **Schema**: Add `compression` to Prisma `Job` model & Run Migration.
2.  [ ] **UI**: Add Compression Selector to Job Form.
3.  [ ] **Lib**: Create `compression.ts` stream helpers.
4.  [ ] **Backend**: Update `runner.ts` to include compression stream in pipeline.
5.  [ ] **Backend**: Update `restore-service.ts` to handle decompression.
6.  [ ] **Feature**: Implement Progress Tracking (API + Stream Monitor).
