"use server"

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helper function to delete old avatar file
async function deleteOldAvatar(userImage: string | null) {
    if (!userImage || !userImage.startsWith('/uploads/avatars/')) return;

    try {
        const filename = path.basename(userImage);
        const filepath = path.join(process.cwd(), "public", "uploads", "avatars", filename);
        await unlink(filepath);
    } catch (error) {
        console.error("Failed to delete old avatar file:", error);
        // Continue execution even if file deletion fails
    }
}

export async function uploadAvatar(formData: FormData) {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file uploaded" };
    }

    // Validate request body
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { success: false, error: "File too large (max 5MB)" };
    }

    if (!file.type.startsWith("image/")) {
        return { success: false, error: "Invalid file type" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${session.user.id}-${Date.now()}${path.extname(file.name)}`;
    
    // Ensure the uploads directory matches where we created it (public/uploads/avatars)
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    const filepath = path.join(uploadDir, filename);

    try {
        // Delete old avatar if it exists (check database explicitly to get latest state if needed, 
        // but session.user.image is usually sufficient handled by better-auth session)
        // Ideally we should fetch the user from DB to be sure, but session is likely fresh enough or we can fetch.
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } });
        if (user?.image) {
            await deleteOldAvatar(user.image);
        }

        await writeFile(filepath, buffer);
        
        const publicUrl = `/uploads/avatars/${filename}`;

        await prisma.user.update({
            where: { id: session.user.id },
            data: { image: publicUrl }
        });

        revalidatePath("/dashboard/settings");
        revalidatePath("/dashboard"); // For navbar/sidebar avatar
        
        return { success: true, url: publicUrl };
    } catch (error) {
        console.error("Upload error:", error);
        return { success: false, error: "Failed to save file" };
    }
}

export async function removeAvatar() {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Fetch user to get the current image path
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } });
        
        if (user?.image) {
             await deleteOldAvatar(user.image);
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { image: null }
        });

        revalidatePath("/dashboard/settings");
        revalidatePath("/dashboard");
        
        return { success: true };
    } catch (error) {
        console.error("Remove avatar error:", error);
        return { success: false, error: "Failed to remove avatar" };
    }
}
