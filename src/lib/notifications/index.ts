/**
 * Barrel export for the notification framework.
 */

export { NOTIFICATION_EVENTS } from "./types";
export type {
  NotificationEventType,
  NotificationEventData,
  NotificationPayload,
  SystemNotificationConfig,
  UserLoginData,
  UserCreatedData,
  BackupResultData,
  RestoreResultData,
  ConfigBackupData,
  SystemErrorData,
} from "./types";
export { EVENT_DEFINITIONS, getEventDefinition, getEventsByCategory } from "./events";
export { renderTemplate } from "./templates";
