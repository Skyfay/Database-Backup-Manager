import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { verifyTotpToken } from "@/lib/totp"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
        async authorize(credentials) {
            const parsedCredentials = z
                .object({
                    email: z.string().email(),
                    password: z.string().min(6),
                    code: z.string().optional() // Add code to schema
                })
                .safeParse(credentials);

            if (parsedCredentials.success) {
                const { email, password, code } = parsedCredentials.data;
                const user = await prisma.user.findUnique({
                    where: { email }
                });

                if (!user ||!user.password) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (passwordsMatch) {
                    // Check if 2FA is enabled
                    if (user.isTwoFactorEnabled && user.totpSecret) {
                         if (!code) {
                             // User has 2FA enabled but didn't provide code
                             // We can't easily return a specific error type to the client with Credentials provider
                             // in a clean way that distinguishes from bad password without throwing
                             // But throwing an error is caught by NextAuth.
                             // A common pattern is to throw an error with a specific message
                             throw new Error("2FA_REQUIRED");
                         }

                         const isValidToken = verifyTotpToken(code, user.totpSecret);
                         if (!isValidToken) {
                             return null; // Invalid code
                         }
                    }

                    return user;
                }
            }
            return null;
        }
    })
  ],
})
