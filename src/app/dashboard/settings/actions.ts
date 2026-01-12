"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"

const accountSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

export async function updateAccount(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: "Not authenticated" }
  }

  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  }

  // Filter out empty strings
  const data: Record<string, any> = {}
  for (const [key, value] of Object.entries(rawData)) {
      if (value && typeof value === 'string' && value.trim() !== '') {
          data[key] = value
      }
  }

  const result = accountSchema.safeParse(data)

  if (!result.success) {
    return { error: "Validation failed" }
  }

  const { name, email, currentPassword, newPassword } = result.data

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
        return { error: "User not found" }
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    if (newPassword) {
        if (!currentPassword) {
             return { error: "Current password is required to change password" }
        }
        if (!user.password) {
            // Should not happen for credentials user
             return { error: "User has no password set" }
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, user.password)
        if (!passwordsMatch) {
            return { error: "Incorrect current password" }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        updateData.password = hashedPassword
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    })

    revalidatePath("/dashboard")
    return { success: "Account updated successfully" }
  } catch (error) {
    return { error: "Failed to update account" }
  }
}
