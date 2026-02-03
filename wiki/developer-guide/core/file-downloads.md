# File Download System

DBackup provides a secure and flexible file download system that supports browser downloads, streaming decryption, and temporary tokens for CLI tools.

## Architecture

The download system consists of three main components:

1. **Dashboard UI**: `StorageClient` and `ActionCell` handling user interactions.
2. **API Routes**: Endpoints for initiating downloads and generating tokens.
3. **Token Store**: In-memory store for short-lived download tokens.

## Workflow

### 1. Browser Download (Authenticated)

This is the standard flow when clicking "Download" in the dashboard.

1. User clicks download.
2. `handleDownload` opens `/api/storage/[id]/download?file=...` in a new tab.
3. **Authentication**: Session cookie is checked.
4. **Authorization**: `PERMISSIONS.STORAGE.DOWNLOAD` is verified.
5. **Streaming**:
   - If `decrypt=true`: `createDecryptionStream()` is piped to response.
   - If `decrypt=false`: Raw stream is piped.

### 2. CLI / Public Download (Token-based)

This flow allows downloading via `wget` or `curl` without passing credentials in the request headers (since the link contains the auth token).

#### A. Token Generation
1. User clicks "Wget / Curl Link".
2. Client calls `POST /api/storage/[id]/download-url` with `{ file: path }`.
3. Server verifies session and permissions.
4. `generateDownloadToken(storageId, file)` creates a random 32-byte hex token.
5. Token is stored in memory with metadata (`expiresAt` = now + 5 min).
6. Server returns the public URL: `/api/storage/public-download?token=...`.

#### B. File Download
1. User runs `wget <url>`.
2. Request hits `/api/storage/public-download`.
3. `consumeDownloadToken(token)` validates and removes the token (Single-use).
4. If valid, the file is streamed to the response.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/download-tokens.ts` | Token generation and validation logic (in-memory Map). |
| `src/app/api/storage/[id]/download/route.ts` | Authenticated download endpoint. |
| `src/app/api/storage/[id]/download-url/route.ts` | Token generation endpoint. |
| `src/app/api/storage/public-download/route.ts` | Public (token-protected) download endpoint. |

## Security Considerations

- **Short-lived Tokens**: Tokens expire in **5 minutes**.
- **Single Use**: Tokens are deleted immediately after use (preventing replay attacks).
- **Encryption**: Token generation uses `crypto.randomBytes`.
- **Permissions**: Token generation requires the same RBAC permissions as a regular download.

## Adding Support to New Adapters

Since downloads are handled by the generic `StorageAdapter` interface (`download()` method), all storage adapters (S3, Local, FTP, etc.) automatically support this feature without extra code.
