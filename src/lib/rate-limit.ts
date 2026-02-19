import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from './logger';

const log = logger.child({ module: "RateLimit" });

// ── Default Values ─────────────────────────────────────────────

export const RATE_LIMIT_DEFAULTS = {
    auth: { points: 5, duration: 60 },
    api: { points: 100, duration: 60 },
    mutation: { points: 20, duration: 60 },
} as const;

export interface RateLimitConfig {
    auth: { points: number; duration: number };
    api: { points: number; duration: number };
    mutation: { points: number; duration: number };
}

// ── SystemSetting Keys ─────────────────────────────────────────

export const RATE_LIMIT_KEYS = {
    authPoints: "rateLimit.auth.points",
    authDuration: "rateLimit.auth.duration",
    apiPoints: "rateLimit.api.points",
    apiDuration: "rateLimit.api.duration",
    mutationPoints: "rateLimit.mutation.points",
    mutationDuration: "rateLimit.mutation.duration",
} as const;

// ── Limiter Container (mutable object for safe re-assignment) ──

/**
 * Shared container holding the current rate limiter instances.
 * Using a mutable object ensures the middleware always sees updated
 * limiters even after webpack bundling (live ES module bindings may
 * not survive webpack's module wrapper).
 */
const limiters = {
    auth: new RateLimiterMemory({
        points: RATE_LIMIT_DEFAULTS.auth.points,
        duration: RATE_LIMIT_DEFAULTS.auth.duration,
    }),
    api: new RateLimiterMemory({
        points: RATE_LIMIT_DEFAULTS.api.points,
        duration: RATE_LIMIT_DEFAULTS.api.duration,
    }),
    mutation: new RateLimiterMemory({
        points: RATE_LIMIT_DEFAULTS.mutation.points,
        duration: RATE_LIMIT_DEFAULTS.mutation.duration,
    }),
};

// ── Public Getters (stable references) ─────────────────────────

/** Auth limiter – login attempts */
export function getAuthLimiter() { return limiters.auth; }
/** API (GET) limiter – read requests */
export function getApiLimiter() { return limiters.api; }
/** Mutation limiter – write requests (POST/PUT/DELETE) */
export function getMutationLimiter() { return limiters.mutation; }

// ── Helpers ────────────────────────────────────────────────────

function parseSetting(settingMap: Map<string, string>, key: string, fallback: number): number {
    const val = settingMap.get(key);
    if (!val) return fallback;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? fallback : num;
}

// ── Dynamic Reload ─────────────────────────────────────────────

/**
 * Reload rate limiters from SystemSetting values stored in the database.
 * Called on application startup and after settings changes.
 */
export async function reloadRateLimits(): Promise<void> {
    try {
        // Dynamic import to avoid circular dependency with prisma
        const prisma = (await import('./prisma')).default;

        const keys = Object.values(RATE_LIMIT_KEYS);
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: keys } },
        });

        const settingMap = new Map(settings.map(s => [s.key, s.value]));

        const authPoints = parseSetting(settingMap, RATE_LIMIT_KEYS.authPoints, RATE_LIMIT_DEFAULTS.auth.points);
        const authDuration = parseSetting(settingMap, RATE_LIMIT_KEYS.authDuration, RATE_LIMIT_DEFAULTS.auth.duration);
        const apiPoints = parseSetting(settingMap, RATE_LIMIT_KEYS.apiPoints, RATE_LIMIT_DEFAULTS.api.points);
        const apiDuration = parseSetting(settingMap, RATE_LIMIT_KEYS.apiDuration, RATE_LIMIT_DEFAULTS.api.duration);
        const mutationPoints = parseSetting(settingMap, RATE_LIMIT_KEYS.mutationPoints, RATE_LIMIT_DEFAULTS.mutation.points);
        const mutationDuration = parseSetting(settingMap, RATE_LIMIT_KEYS.mutationDuration, RATE_LIMIT_DEFAULTS.mutation.duration);

        // Replace limiter instances on the shared container
        limiters.auth = new RateLimiterMemory({ points: authPoints, duration: authDuration });
        limiters.api = new RateLimiterMemory({ points: apiPoints, duration: apiDuration });
        limiters.mutation = new RateLimiterMemory({ points: mutationPoints, duration: mutationDuration });

        log.info("Rate limiters reloaded", {
            auth: `${authPoints}/${authDuration}s`,
            api: `${apiPoints}/${apiDuration}s`,
            mutation: `${mutationPoints}/${mutationDuration}s`,
        });
    } catch (error) {
        log.warn("Failed to reload rate limits from DB, using current values", { error: String(error) });
    }
}

/**
 * Get current rate limit configuration (for displaying in UI).
 * Reads from DB, falls back to defaults.
 */
export async function getRateLimitConfig(): Promise<RateLimitConfig> {
    try {
        const prisma = (await import('./prisma')).default;
        const keys = Object.values(RATE_LIMIT_KEYS);
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: keys } },
        });

        const settingMap = new Map(settings.map(s => [s.key, s.value]));

        return {
            auth: {
                points: parseSetting(settingMap, RATE_LIMIT_KEYS.authPoints, RATE_LIMIT_DEFAULTS.auth.points),
                duration: parseSetting(settingMap, RATE_LIMIT_KEYS.authDuration, RATE_LIMIT_DEFAULTS.auth.duration),
            },
            api: {
                points: parseSetting(settingMap, RATE_LIMIT_KEYS.apiPoints, RATE_LIMIT_DEFAULTS.api.points),
                duration: parseSetting(settingMap, RATE_LIMIT_KEYS.apiDuration, RATE_LIMIT_DEFAULTS.api.duration),
            },
            mutation: {
                points: parseSetting(settingMap, RATE_LIMIT_KEYS.mutationPoints, RATE_LIMIT_DEFAULTS.mutation.points),
                duration: parseSetting(settingMap, RATE_LIMIT_KEYS.mutationDuration, RATE_LIMIT_DEFAULTS.mutation.duration),
            },
        };
    } catch {
        return { ...RATE_LIMIT_DEFAULTS };
    }
}
