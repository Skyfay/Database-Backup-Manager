"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { generateTotpSecret, generateTotpQrCode, verifyTotpToken } from "@/lib/totp"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function setupTwoFactor() {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    const secret = generateTotpSecret()
    const qrCode = await generateTotpQrCode(secret, session.user.email)

    // Store the secret temporarily or update the user but keep isTwoFactorEnabled false until verified
    await prisma.user.update({
        where: { email: session.user.email },
        data: { totpSecret: secret }
    })

    return { secret, qrCode }
}

export async function confirmTwoFactor(token: string) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { totpSecret: true }
    })

    if (!user?.totpSecret) return { error: "Setup not initialized" }

    const isValid = verifyTotpToken(token, user.totpSecret)

    if (isValid) {
        await prisma.user.update({
            where: { email: session.user.email },
            data: { isTwoFactorEnabled: true }
        })
        revalidatePath("/dashboard/settings")
        return { success: "Two-factor authentication enabled" }
    } else {
        return { error: "Invalid code" }
    }
}

export async function disableTwoFactor() {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    await prisma.user.update({
        where: { email: session.user.email },
        data: {
            isTwoFactorEnabled: false,
            totpSecret: null,
         }
    })
    revalidatePath("/dashboard/settings")
    return { success: "Two-factor authentication disabled" }
}
