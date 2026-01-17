import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PERMISSIONS, Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function getCurrentUserWithGroup() {
    // Wrap to prevent crash if headers/session fails significantly
    let session;
    try {
        session = await auth.api.getSession({
            headers: await headers()
        });
    } catch (e) {
        console.error("Session check failed in access-control:", e);
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
            console.log("Auto-promoting first user to SuperAdmin...");
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
        throw new Error("Unauthorized");
    }

    if (!user.group) {
        throw new Error(`Forbidden: No group assigned. Missing permission: ${permission}`);
    }

    let permissions: string[] = [];
    try {
        permissions = JSON.parse(user.group.permissions);
    } catch (e) {
        console.error("Failed to parse group permissions", e);
    }

    if (!permissions.includes(permission)) {
        throw new Error(`Forbidden: You do not have the required permission: ${permission}`);
    }

    return user;
}

export async function getUserPermissions(): Promise<string[]> {
    const user = await getCurrentUserWithGroup();
    if (!user || !user.group) return [];

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
