/**
 * Demo Mode Utilities
 *
 * Provides utilities for running DBackup in demo mode.
 * Demo mode is enabled via the DEMO_MODE environment variable.
 *
 * When demo mode is active:
 * - Certain destructive or security-sensitive actions are blocked
 * - A demo login button is shown on the login page
 * - The instance should be reset periodically (e.g., every 10 minutes)
 *
 * @see /wiki/developer-guide/demo-mode.md for full documentation
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "demo-mode" });

/**
 * Check if demo mode is enabled.
 * Demo mode is controlled by the DEMO_MODE environment variable.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * Get demo credentials from environment variables.
 * Returns null if demo mode is not enabled or credentials are not configured.
 */
export function getDemoCredentials(): { email: string; password: string } | null {
  if (!isDemoMode()) {
    return null;
  }

  const email = process.env.DEMO_USER;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    log.warn("Demo mode is enabled but DEMO_USER or DEMO_PASSWORD is not set");
    return null;
  }

  return { email, password };
}

/**
 * Actions that are blocked in demo mode.
 * These actions could compromise the demo instance or lock out other users.
 */
export const DEMO_BLOCKED_ACTIONS = [
  "password-change",
  "email-change",
  "user-create",
  "user-delete",
  "two-factor-enable",
  "two-factor-disable",
  "two-factor-reset",
  "passkey-toggle",
  "sso-provider-create",
  "sso-provider-update",
  "sso-provider-delete",
  "encryption-key-delete",
] as const;

export type DemoBlockedAction = (typeof DEMO_BLOCKED_ACTIONS)[number];

/**
 * Error thrown when an action is blocked in demo mode.
 */
export class DemoModeError extends Error {
  constructor(action: DemoBlockedAction) {
    super(`This action is disabled in demo mode: ${action}`);
    this.name = "DemoModeError";
  }
}

/**
 * Assert that the current action is allowed (i.e., demo mode is not active).
 * Throws DemoModeError if demo mode is enabled.
 *
 * @param action - The action being attempted (for error message)
 * @throws DemoModeError if demo mode is enabled
 *
 * @example
 * ```typescript
 * export async function updateOwnPassword(...) {
 *   assertNotDemoMode("password-change");
 *   // ... rest of implementation
 * }
 * ```
 */
export function assertNotDemoMode(action: DemoBlockedAction): void {
  if (isDemoMode()) {
    log.info("Blocked action in demo mode", { action });
    throw new DemoModeError(action);
  }
}

/**
 * Get a user-friendly message for demo mode restrictions.
 */
export function getDemoModeMessage(): string {
  return "This action is disabled in demo mode. The demo resets every 10 minutes.";
}

/**
 * Configuration for the demo environment.
 * These values match the docker-compose.demo.yml setup.
 */
export const DEMO_CONFIG = {
  /** Default demo user email */
  defaultEmail: "demo@dbackup.app",
  /** Default demo user password */
  defaultPassword: "demo123456",
  /** Reset interval in minutes */
  resetIntervalMinutes: 10,
  /** Demo databases available */
  databases: {
    mysql: {
      host: "mysql-demo",
      port: 3306,
      user: "root",
      password: "demorootpassword",
    },
    postgres: {
      host: "postgres-demo",
      port: 5432,
      user: "demouser",
      password: "demopassword",
    },
    mongodb: {
      host: "mongo-demo",
      port: 27017,
      user: "root",
      password: "demorootpassword",
    },
  },
} as const;
