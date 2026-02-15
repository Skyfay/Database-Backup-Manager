/**
 * Registry of all supported system notification events.
 */

import {
  NotificationEventDefinition,
  NOTIFICATION_EVENTS,
} from "./types";

/** All available notification event definitions */
export const EVENT_DEFINITIONS: NotificationEventDefinition[] = [
  // ── Auth Events ──────────────────────────────────────────────
  {
    id: NOTIFICATION_EVENTS.USER_LOGIN,
    name: "User Login",
    description: "A user logged into the application.",
    category: "auth",
    defaultEnabled: false,
  },
  {
    id: NOTIFICATION_EVENTS.USER_CREATED,
    name: "User Created",
    description: "A new user account was created.",
    category: "auth",
    defaultEnabled: false,
  },

  // ── Backup Events ────────────────────────────────────────────
  {
    id: NOTIFICATION_EVENTS.BACKUP_SUCCESS,
    name: "Backup Successful",
    description: "A backup job completed successfully.",
    category: "backup",
    defaultEnabled: true,
  },
  {
    id: NOTIFICATION_EVENTS.BACKUP_FAILURE,
    name: "Backup Failed",
    description: "A backup job failed.",
    category: "backup",
    defaultEnabled: true,
  },

  // ── Restore Events ───────────────────────────────────────────
  {
    id: NOTIFICATION_EVENTS.RESTORE_COMPLETE,
    name: "Restore Completed",
    description: "A database restore was completed successfully.",
    category: "restore",
    defaultEnabled: true,
  },
  {
    id: NOTIFICATION_EVENTS.RESTORE_FAILURE,
    name: "Restore Failed",
    description: "A database restore failed.",
    category: "restore",
    defaultEnabled: true,
  },

  // ── System Events ────────────────────────────────────────────
  {
    id: NOTIFICATION_EVENTS.CONFIG_BACKUP,
    name: "Configuration Backup",
    description: "A system configuration backup was created.",
    category: "system",
    defaultEnabled: false,
  },
  {
    id: NOTIFICATION_EVENTS.SYSTEM_ERROR,
    name: "System Error",
    description: "A critical system error occurred.",
    category: "system",
    defaultEnabled: true,
  },
];

/** Look up an event definition by its type string */
export function getEventDefinition(
  eventType: string
): NotificationEventDefinition | undefined {
  return EVENT_DEFINITIONS.find((e) => e.id === eventType);
}

/** Get all event definitions grouped by category */
export function getEventsByCategory(): Record<
  string,
  NotificationEventDefinition[]
> {
  const grouped: Record<string, NotificationEventDefinition[]> = {};
  for (const event of EVENT_DEFINITIONS) {
    if (!grouped[event.category]) {
      grouped[event.category] = [];
    }
    grouped[event.category].push(event);
  }
  return grouped;
}
