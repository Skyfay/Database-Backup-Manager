import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getPublicSsoProviders } from "@/app/actions/oidc";

export default async function Home() {
    const headersList = await headers();
    let session = null;
    try {
        session = await auth.api.getSession({
            headers: headersList
        });
    } catch (error) {
        // Silently fail if session check fails on home, just show login
    }

    if (session) {
        redirect("/dashboard");
    }

    const userCount = await prisma.user.count();
    const ssoProviders = await getPublicSsoProviders();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50">
             <div className="mb-8 font-bold text-2xl tracking-tight">
                Database Backup Manager
             </div>
            <LoginForm allowSignUp={userCount === 0} ssoProviders={ssoProviders} />
        </div>
    );
}
