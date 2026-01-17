"use server"

import prisma from "@/lib/prisma";
import { User } from "better-auth";
import { revalidatePath } from "next/cache";
import { checkPermission, getCurrentUserWithGroup } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { auth } from "@/lib/auth";

export async function createUser(data: { name: string; email: string; password: string }) {
    await checkPermission(PERMISSIONS.USERS.WRITE);

    try {
        await auth.api.signUpEmail({
            body: {
                name: data.name,
                email: data.email,
                password: data.password,
            },
            // We do not pass headers, to avoid setting cookies on the current response (hopefully)
            // Or we can explicitly tell it not to sign in if supported, but signUpEmail usually signs in.
            // Since we are in a Server Action, unless we manually forward Set-Cookie headers,
            // the implicit session creation (DB side) won't affect the browser's cookie jar
            // unless better-auth magic hooks into Next.js headers() automatically.
        });

        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error: any) {
        // Better auth error handling
        let errorMessage = "Failed to create user";
        if (error?.body?.message) {
            errorMessage = error.body.message;
        } else if (error?.message) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

export async function getUsers() {
    await checkPermission(PERMISSIONS.USERS.READ);

    return await prisma.user.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            group: true
        }
    });
}

export async function updateUserGroup(userId: string, groupId: string | null) {
    await checkPermission(PERMISSIONS.USERS.WRITE);

    try {
        const targetGroupId = groupId === "none" ? null : groupId;

        // Security check: Prevent removing the last SuperAdmin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { group: true }
        });

        if (user?.group?.name === "SuperAdmin" && targetGroupId !== user.groupId) {
            const superAdminCount = await prisma.user.count({
                where: {
                    group: {
                        name: "SuperAdmin"
                    }
                }
            });

            if (superAdminCount <= 1) {
                return { success: false, error: "Cannot remove the last user from the SuperAdmin group." };
            }
        }

        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                groupId: targetGroupId
            }
        });
        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to update user group:", error);
        return { success: false, error: "Failed to update user group" };
    }
}

export async function deleteUser(userId: string) {
    await checkPermission(PERMISSIONS.USERS.WRITE);

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { group: true }
        });

        // Check if user is the last SuperAdmin
        if (user?.group?.name === "SuperAdmin") {
             const superAdminCount = await prisma.user.count({
                 where: {
                     group: {
                         name: "SuperAdmin"
                     }
                 }
             });
             if (superAdminCount <= 1) {
                  return { success: false, error: "Cannot delete the last SuperAdmin user." };
             }
        }

        // Check if user is the last one? maybe not necessary for now but good practice
        const userCount = await prisma.user.count();
        if (userCount <= 1) {
             throw new Error("Cannot delete the last user.");
        }

        await prisma.user.delete({
            where: {
                id: userId
            }
        });
        revalidatePath("/dashboard/users");
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete user" };
    }
}

export async function togglePasskeyTwoFactor(userId: string, enabled: boolean) {
    const currentUser = await getCurrentUserWithGroup();
    if (!currentUser) throw new Error("Unauthorized");

    // Allow user to edit their own settings, otherwise require permission
    if (currentUser.id !== userId) {
        await checkPermission(PERMISSIONS.USERS.WRITE);
    }

    try {
        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                passkeyTwoFactor: enabled,
                twoFactorEnabled: enabled // Force enable native 2FA flag to trigger 2FA flow
            }
        });
        
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to update passkey settings" };
    }
}

export async function updateUser(userId: string, data: { name?: string; email?: string; timezone?: string; dateFormat?: string; timeFormat?: string }) {
    const currentUser = await getCurrentUserWithGroup();
    if (!currentUser) throw new Error("Unauthorized");

    // Allow user to edit their own profile, otherwise require permission
    if (currentUser.id !== userId) {
        await checkPermission(PERMISSIONS.USERS.WRITE);
    }

    try {
        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                name: data.name,
                email: data.email,
                timezone: data.timezone,
                dateFormat: data.dateFormat,
                timeFormat: data.timeFormat
            }
        });
        revalidatePath("/dashboard/users");
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
         console.error(error);
        return { success: false, error: "Failed to update user" };
    }
}
