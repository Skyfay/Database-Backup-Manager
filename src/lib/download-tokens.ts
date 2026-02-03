/**
 * Temporary Download Token Store
 *
 * Stores short-lived tokens for file downloads.
 * Tokens are valid for 5 minutes and single-use.
 */

import crypto from "crypto";

interface DownloadToken {
    storageId: string;
    file: string;
    decrypt: boolean;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}

// Token validity: 5 minutes
const TOKEN_TTL_MS = 5 * 60 * 1000;

// Cleanup interval: 1 minute
const CLEANUP_INTERVAL_MS = 60 * 1000;

// Use globalThis to persist store across hot reloads in development
const globalForTokens = globalThis as unknown as {
    downloadTokenStore: Map<string, DownloadToken> | undefined;
    downloadTokenCleanupStarted: boolean | undefined;
};

// Initialize store if not exists (survives hot reloads)
if (!globalForTokens.downloadTokenStore) {
    globalForTokens.downloadTokenStore = new Map<string, DownloadToken>();
}

const tokenStore = globalForTokens.downloadTokenStore;

/**
 * Generate a new download token
 */
export function generateDownloadToken(storageId: string, file: string, decrypt: boolean = true): string {
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();

    tokenStore.set(token, {
        storageId,
        file,
        decrypt,
        createdAt: now,
        expiresAt: now + TOKEN_TTL_MS,
        used: false
    });

    return token;
}

/**
 * Validate and consume a download token
 * Returns the token data if valid, null otherwise
 * Token is marked as used after validation
 */
export function consumeDownloadToken(token: string): DownloadToken | null {
    const data = tokenStore.get(token);

    if (!data) {
        return null;
    }

    // Check if expired
    if (Date.now() > data.expiresAt) {
        tokenStore.delete(token);
        return null;
    }

    // Check if already used
    if (data.used) {
        return null;
    }

    // Note: Token is NOT marked as used here anymore
    // Call markTokenUsed() after successful download

    return data;
}

/**
 * Mark a token as used (call after successful download)
 */
export function markTokenUsed(token: string): void {
    const data = tokenStore.get(token);
    if (data) {
        data.used = true;
    }
}

/**
 * Cleanup expired tokens
 */
function cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of tokenStore.entries()) {
        // Remove if expired or used more than 1 minute ago
        if (now > data.expiresAt || (data.used && now > data.createdAt + CLEANUP_INTERVAL_MS)) {
            tokenStore.delete(token);
        }
    }
}

// Start cleanup interval (only once, survives hot reloads)
if (typeof setInterval !== "undefined" && !globalForTokens.downloadTokenCleanupStarted) {
    globalForTokens.downloadTokenCleanupStarted = true;
    setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
}

/**
 * Get token store size (for debugging)
 */
export function getTokenStoreSize(): number {
    return tokenStore.size;
}
