import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Dynamically fetch trusted origins from SSO providers in the database.
 * This allows users to configure SSO providers via UI without hardcoding origins.
 */
async function getTrustedOriginsFromDb(): Promise<string[]> {
    try {
        const providers = await prisma.ssoProvider.findMany({
            where: { enabled: true },
            select: { issuer: true }
        });
        return providers
            .map(p => p.issuer)
            .filter((issuer): issuer is string => !!issuer);
    } catch {
        // During initial setup, DB might not be ready
        return [];
    }
}

/**
 * Synchronously fetch trusted SSO provider IDs from the database.
 * This is called at server startup to populate trustedProviders.
 * Note: New providers added after server start require a restart to be trusted.
 */
function getTrustedProvidersSync(): string[] {
    // We use a cached value that gets populated on first request
    // For now, return a wildcard approach - we'll trust all providers by email verification
    return [];
}

// Cache for trusted providers - populated on first auth request
let trustedProvidersCache: string[] | null = null;

async function refreshTrustedProvidersCache(): Promise<string[]> {
    try {
        const providers = await prisma.ssoProvider.findMany({
            where: { enabled: true },
            select: { providerId: true }
        });
        trustedProvidersCache = providers.map(p => p.providerId);
        return trustedProvidersCache;
    } catch {
        return [];
    }
}

// Initialize cache on module load
refreshTrustedProvidersCache();

export const auth = betterAuth({
    logging: {
        level: "debug"
    },
    baseURL: process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: async (request) => {
        // Base trusted origins
        const baseOrigins = [
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        ];

        // During SSO callback, we need to trust the IdP origins
        // Fetch them dynamically from the database
        const ssoOrigins = await getTrustedOriginsFromDb();

        return [...baseOrigins, ...ssoOrigins];
    },
    database: prismaAdapter(prisma, {
        provider: "sqlite",
    }),
    account: {
        // Enable automatic account linking for SSO providers
        // All accounts from SSO providers are trusted regardless of email domain
        accountLinking: {
            enabled: true,
            // Allow linking accounts even if email domains don't match
            allowDifferentEmails: true,
        }
    },
    user: {
        additionalFields: {
            timezone: {
                type: "string",
                required: false,
                defaultValue: "UTC"
            },
            dateFormat: {
                type: "string",
                required: false,
                defaultValue: "P"
            },
            timeFormat: {
                type: "string",
                required: false,
                defaultValue: "p"
            },
            passkeyTwoFactor: {
                type: "boolean",
                required: false,
                defaultValue: false
            }
        }
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
    plugins: [
        twoFactor(),
        passkey(),
        sso({
            // Trust email verification status from IdP
            // This allows automatic user creation without domain matching
            trustEmailVerified: true,
        })
    ]
});
