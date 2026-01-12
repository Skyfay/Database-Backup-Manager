import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { auth } from "@/auth"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    return (
        <div className="flex min-h-screen">
            <Sidebar user={session?.user || {}} />
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
