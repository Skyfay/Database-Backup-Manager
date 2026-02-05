import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PERMISSIONS, Permission, AVAILABLE_PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AuthenticationError, PermissionError, wrapError } from "@/lib/errors";

const log = logger.child({ module: "AccessControl" });

export async function getCurrentUserWithGroup() {
    // Wrap to prevent crash if headers/session fails significantly
    let session;
    try {
        session = await auth.api.getSession({
            headers: await headers()
        });
    } catch (error) {
        log.error("Session check failed", {}, wrapError(error));
        return null;
    }

    if (!session?.user) {
        return null;
    }

    let user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { group: true }
    });

    // Auto-promote first user logic (Self-Healing)
    if (user && !user.groupId) {
        const userCount = await prisma.user.count();
        if (userCount === 1) {
            log.info("Auto-promoting first user to SuperAdmin");
            const allPermissions = Object.values(PERMISSIONS).flatMap(group => Object.values(group));

            const group = await prisma.group.upsert({
                where: { name: "SuperAdmin" },
                update: { permissions: JSON.stringify(allPermissions) },
                create: {
                    name: "SuperAdmin",
                    permissions: JSON.stringify(allPermissions)
                }
            });

            user = await prisma.user.update({
                where: { id: user.id },
                data: { groupId: group.id },
                include: { group: true }
            });
        }
    }

    return user;
}

export async function checkPermission(permission: Permission) {
    const user = await getCurrentUserWithGroup();

    if (!user) {
        throw new AuthenticationError();
    }

    if (!user.group) {
        throw new PermissionError(permission, { context: { reason: "No group assigned" } });
    }

    // SuperAdmin always has all permissions
    if (user.group.name === "SuperAdmin") {
        return user;
    }

    let permissions: string[] = [];
    try {
        permissions = JSON.parse(user.group.permissions);
    } catch (error) {
        log.error("Failed to parse group permissions", { groupId: user.group.id }, wrapError(error));
    }

    if (!permissions.includes(permission)) {
        throw new PermissionError(permission);
    }

    return user;
}

export async function getUserPermissions(): Promise<string[]> {
    const user = await getCurrentUserWithGroup();
    if (!user || !user.group) return [];

    // SuperAdmin always has all permissions
    if (user.group.name === "SuperAdmin") {
        return AVAILABLE_PERMISSIONS.map(p => p.id);
    }

    try {
        return JSON.parse(user.group.permissions);
    } catch {
        return [];
    }
}

export async function hasPermission(permission: Permission): Promise<boolean> {
    try {
        await checkPermission(permission);
        return true;
    } catch {
        return false;
    }
}
