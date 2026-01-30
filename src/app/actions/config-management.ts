"use server";

import { checkPermission } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { ConfigService } from "@/services/config-service";
import { AppConfigurationBackup, RestoreOptions } from "@/lib/types/config-backup";
import { runConfigBackup } from "@/lib/runner/config-runner";

const configService = new ConfigService();

/**
 * Exports the system configuration.
 * @param includeSecrets Whether to include decrypted secrets.
 */
export async function exportConfigAction(includeSecrets: boolean) {
  await checkPermission(PERMISSIONS.SETTINGS.READ); // Reading settings to export

  try {
    const data = await configService.export(includeSecrets);
    return { success: true, data };
  } catch (error) {
    console.error("Export config error:", error);
    return { success: false, error: "Failed to export configuration" };
  }
}

/**
 * Trigger the Automated Config Backup Logic Manually
 */
export async function triggerManualConfigBackupAction() {
    await checkPermission(PERMISSIONS.SETTINGS.WRITE);
    try {
        // Trigger the runner async (fire & forget from UI perspective, but we await completion to inform user)
        // Actually, runConfigBackup is async.
        await runConfigBackup();
        return { success: true };
    } catch (e: any) {
        console.error("Manual Config Backup Failed", e);
        return { success: false, error: e.message };
    }
}

/**
 * Imports a system configuration.
 * @param data The configuration backup object.
 */
export async function importConfigAction(data: AppConfigurationBackup) {
  await checkPermission(PERMISSIONS.SETTINGS.WRITE); // Writing settings to import

  try {
    await configService.import(data, "OVERWRITE");
    return { success: true };
  } catch (error) {
    console.error("Import config error:", error);
    return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import configuration"
    };
  }
}

/**
 * Restores a configuration backup from storage.
 */
export async function restoreFromStorageAction(
    storageConfigId: string,
    file: string,
    decryptionProfileId?: string,
    options?: RestoreOptions
) {
    await checkPermission(PERMISSIONS.SETTINGS.WRITE);

    try {
        const executionId = await configService.restoreFromStorage(storageConfigId, file, decryptionProfileId, options);
        return { success: true, executionId };
    } catch (error) {
        console.error("Restore from storage error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to initiate restore"
        };
    }
}
