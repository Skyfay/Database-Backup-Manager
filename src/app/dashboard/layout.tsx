import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="border-b h-16 flex items-center px-6 bg-background sticky top-0 z-10">
                    <h2 className="text-lg font-medium">Database Backup Manager</h2>
                    <div className="ml-auto">
                        {/* User nav or theme toggle can go here */}
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
                    <div className="mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
