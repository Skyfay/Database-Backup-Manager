"use server"

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkPermission, getCurrentUserWithGroup } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { apiKeyService } from "@/services/api-key-service";
import { auditService } from "@/services/audit-service";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";
import { logger } from "@/lib/logger";
import { wrapError, getErrorMessage } from "@/lib/errors";
import type { Permission } from "@/lib/permissions";

const log = logger.child({ action: "api-key" });

// ============================================================================
// Validation Schemas
// ============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  expiresAt: z.string().datetime().nullable().optional(),
});

const updatePermissionsSchema = z.object({
  id: z.string().uuid(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

export type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;

// ============================================================================
// Server Actions
// ============================================================================

/**
 * List all API keys. Returns keys with metadata but never the secret.
 */
export async function getApiKeys() {
  await checkPermission(PERMISSIONS.API_KEYS.READ);

  return apiKeyService.list();
}

/**
 * Create a new API key. Returns the raw key ONCE — it will not be shown again.
 */
export async function createApiKey(data: CreateApiKeyFormValues) {
  await checkPermission(PERMISSIONS.API_KEYS.WRITE);
  const currentUser = await getCurrentUserWithGroup();

  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const validated = createApiKeySchema.parse(data);

    const result = await apiKeyService.create({
      name: validated.name,
      permissions: validated.permissions as Permission[],
      userId: currentUser.id,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
    });

    revalidatePath("/dashboard/users");

    await auditService.log(
      currentUser.id,
      AUDIT_ACTIONS.CREATE,
      AUDIT_RESOURCES.API_KEY,
      {
        apiKeyId: result.apiKey.id,
        name: validated.name,
        permissionCount: validated.permissions.length,
      },
      result.apiKey.id
    );

    return {
      success: true,
      data: {
        apiKey: result.apiKey,
        rawKey: result.rawKey,
      },
    };
  } catch (error) {
    log.error("Failed to create API key", {}, wrapError(error));
    return { success: false, error: getErrorMessage(error) || "Failed to create API key" };
  }
}

/**
 * Delete an API key by ID.
 */
export async function deleteApiKey(id: string) {
  await checkPermission(PERMISSIONS.API_KEYS.WRITE);
  const currentUser = await getCurrentUserWithGroup();

  try {
    const existing = await apiKeyService.getById(id);

    await apiKeyService.delete(id);

    revalidatePath("/dashboard/users");

    if (currentUser) {
      await auditService.log(
        currentUser.id,
        AUDIT_ACTIONS.DELETE,
        AUDIT_RESOURCES.API_KEY,
        { name: existing.name, prefix: existing.prefix },
        id
      );
    }

    return { success: true };
  } catch (error) {
    log.error("Failed to delete API key", { id }, wrapError(error));
    return { success: false, error: getErrorMessage(error) || "Failed to delete API key" };
  }
}

/**
 * Enable or disable an API key.
 */
export async function toggleApiKey(id: string, enabled: boolean) {
  await checkPermission(PERMISSIONS.API_KEYS.WRITE);
  const currentUser = await getCurrentUserWithGroup();

  try {
    const result = await apiKeyService.toggle(id, enabled);

    revalidatePath("/dashboard/users");

    if (currentUser) {
      await auditService.log(
        currentUser.id,
        AUDIT_ACTIONS.UPDATE,
        AUDIT_RESOURCES.API_KEY,
        { name: result.name, enabled },
        id
      );
    }

    return { success: true, data: result };
  } catch (error) {
    log.error("Failed to toggle API key", { id, enabled }, wrapError(error));
    return { success: false, error: getErrorMessage(error) || "Failed to toggle API key" };
  }
}

/**
 * Rotate an API key — generates a new secret. Returns the new raw key ONCE.
 */
export async function rotateApiKey(id: string) {
  await checkPermission(PERMISSIONS.API_KEYS.WRITE);
  const currentUser = await getCurrentUserWithGroup();

  try {
    const result = await apiKeyService.rotate(id);

    revalidatePath("/dashboard/users");

    if (currentUser) {
      await auditService.log(
        currentUser.id,
        AUDIT_ACTIONS.UPDATE,
        AUDIT_RESOURCES.API_KEY,
        { name: result.apiKey.name, action: "rotate" },
        id
      );
    }

    return {
      success: true,
      data: {
        apiKey: result.apiKey,
        rawKey: result.rawKey,
      },
    };
  } catch (error) {
    log.error("Failed to rotate API key", { id }, wrapError(error));
    return { success: false, error: getErrorMessage(error) || "Failed to rotate API key" };
  }
}

/**
 * Update the permissions of an API key.
 */
export async function updateApiKeyPermissions(data: { id: string; permissions: string[] }) {
  await checkPermission(PERMISSIONS.API_KEYS.WRITE);
  const currentUser = await getCurrentUserWithGroup();

  try {
    const validated = updatePermissionsSchema.parse(data);

    const result = await apiKeyService.updatePermissions(
      validated.id,
      validated.permissions as Permission[]
    );

    revalidatePath("/dashboard/users");

    if (currentUser) {
      await auditService.log(
        currentUser.id,
        AUDIT_ACTIONS.UPDATE,
        AUDIT_RESOURCES.API_KEY,
        { name: result.name, action: "update_permissions", permissionCount: validated.permissions.length },
        validated.id
      );
    }

    return { success: true, data: result };
  } catch (error) {
    log.error("Failed to update API key permissions", { id: data.id }, wrapError(error));
    return { success: false, error: getErrorMessage(error) || "Failed to update API key permissions" };
  }
}
