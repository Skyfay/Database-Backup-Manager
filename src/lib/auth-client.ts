import { createAuthClient } from "better-auth/react"
import { twoFactorClient } from "better-auth/client/plugins"
import { passkeyClient } from "@better-auth/passkey/client"
import { ssoClient } from "@better-auth/sso/client"

export const authClient = createAuthClient({
    // Note: Client-side uses relative URLs - the browser handles the base URL
    // This works because auth API routes are on the same origin
    baseURL: "",
    plugins: [
        twoFactorClient(),
        passkeyClient(),
        ssoClient()
    ]
})

export const { signIn, signOut, useSession, signUp, twoFactor, passkey } = authClient;
