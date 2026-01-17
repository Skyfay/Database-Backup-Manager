import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let session = null;
    try {
        session = await auth.api.getSession({
            headers: await headers()
        })
    } catch (e) {
        console.error("Dashboard session check failed", e);
    }

    if (!session) {
        redirect("/")
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
                    <div className="mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
