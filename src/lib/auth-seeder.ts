import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function ensureAdminUser() {
    try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            console.log("No users found. Creating default admin user.");
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await prisma.user.create({
                data: {
                    name: "Admin",
                    email: "admin@example.com",
                    password: hashedPassword,
                    emailVerified: new Date(),
                }
            });
            console.log("Default admin user created: admin@example.com / admin123");
        }
    } catch (error) {
        console.error("Failed to ensure admin user:", error);
    }
}
