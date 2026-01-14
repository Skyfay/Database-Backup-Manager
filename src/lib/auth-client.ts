import { createAuthClient } from "better-auth/react"
import { twoFactorClient, passkeyClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [
        twoFactorClient(),
        passkeyClient()
    ]
})

export const { signIn, signOut, useSession, signUp, twoFactor, passkey } = authClient;
