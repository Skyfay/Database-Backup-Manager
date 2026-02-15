/**
 * System Notification Service
 *
 * Sends notifications for system-level events (user login, backup results, etc.)
 * through user-configured notification channels.
 *
 * Configuration is stored in SystemSetting (key: "notifications.config") as JSON.
 * Channels reference existing AdapterConfig entries of type "notification".
 */

import prisma from "@/lib/prisma";
import { registry } from "@/lib/core/registry";
import { NotificationAdapter } from "@/lib/core/interfaces";
import { decryptConfig } from "@/lib/crypto";
import { registerAdapters } from "@/lib/adapters";
import { logger } from "@/lib/logger";
import { wrapError } from "@/lib/errors";
import { renderTemplate } from "@/lib/notifications/templates";
import { getEventDefinition } from "@/lib/notifications/events";
import {
  NotificationEventData,
  SystemNotificationConfig,
} from "@/lib/notifications/types";

const log = logger.child({ service: "SystemNotificationService" });

const SETTING_KEY = "notifications.config";

/** Default configuration when none exists yet */
function defaultConfig(): SystemNotificationConfig {
  return { globalChannels: [], events: {} };
}

// ── Config Management ──────────────────────────────────────────

/** Load the persisted notification config from SystemSetting */
export async function getNotificationConfig(): Promise<SystemNotificationConfig> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SETTING_KEY },
  });
  if (!row) return defaultConfig();

  try {
    return JSON.parse(row.value) as SystemNotificationConfig;
  } catch {
    log.warn("Invalid notification config JSON, returning defaults");
    return defaultConfig();
  }
}

/** Persist the notification config to SystemSetting */
export async function saveNotificationConfig(
  config: SystemNotificationConfig
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(config) },
    create: {
      key: SETTING_KEY,
      value: JSON.stringify(config),
      description: "System notification settings (channels & events)",
    },
  });
}

/** Return all AdapterConfig entries of type "notification" (for channel picker UI) */
export async function getAvailableChannels() {
  return prisma.adapterConfig.findMany({
    where: { type: "notification" },
    select: { id: true, name: true, adapterId: true },
  });
}

// ── Notification Dispatch ──────────────────────────────────────

/**
 * Send a system notification for the given event.
 *
 * 1. Loads the stored config to determine which channels are active.
 * 2. Checks if the event is enabled.
 * 3. Renders the template.
 * 4. Sends through each selected channel (adapter).
 *
 * Failures are logged but never thrown – callers should not be blocked by
 * notification delivery issues.
 */
export async function notify(event: NotificationEventData): Promise<void> {
  try {
    const config = await getNotificationConfig();

    // Determine if the event is enabled
    const eventConfig = config.events[event.eventType];
    const eventDef = getEventDefinition(event.eventType);

    // If no explicit config exists, fall back to the event's default
    const isEnabled = eventConfig
      ? eventConfig.enabled
      : eventDef?.defaultEnabled ?? false;

    if (!isEnabled) {
      log.debug("System notification skipped (disabled)", {
        eventType: event.eventType,
      });
      return;
    }

    // Resolve channel IDs (event-level override or global)
    const channelIds =
      eventConfig?.channels ?? config.globalChannels;

    if (!channelIds || channelIds.length === 0) {
      log.debug("System notification skipped (no channels configured)", {
        eventType: event.eventType,
      });
      return;
    }

    // Render the template
    const payload = renderTemplate(event);

    // Make sure adapters are registered
    registerAdapters();

    // Load channel configs and send
    const channels = await prisma.adapterConfig.findMany({
      where: { id: { in: channelIds }, type: "notification" },
    });

    for (const channel of channels) {
      try {
        const adapter = registry.get(channel.adapterId) as
          | NotificationAdapter
          | undefined;

        if (!adapter) {
          log.warn("Adapter not found for notification channel", {
            channelId: channel.id,
            adapterId: channel.adapterId,
          });
          continue;
        }

        const channelConfig = decryptConfig(JSON.parse(channel.config));

        await adapter.send(channelConfig, payload.message, {
          success: payload.success,
          eventType: event.eventType,
          title: payload.title,
          fields: payload.fields,
          color: payload.color,
        });

        log.info("System notification sent", {
          eventType: event.eventType,
          channelName: channel.name,
          adapterId: channel.adapterId,
        });
      } catch (err) {
        log.error(
          "Failed to send system notification through channel",
          { channelName: channel.name, eventType: event.eventType },
          wrapError(err)
        );
      }
    }
  } catch (err) {
    log.error(
      "System notification dispatch failed",
      { eventType: event.eventType },
      wrapError(err)
    );
  }
}
