"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Database, HardDrive, FolderOpen, CalendarClock, History, Settings, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserNav } from "./user-nav"

const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Database, label: "Sources", href: "/dashboard/sources" },
    { icon: HardDrive, label: "Destinations", href: "/dashboard/destinations" },
    { icon: FolderOpen, label: "Storage Explorer", href: "/dashboard/storage" },
    { icon: CalendarClock, label: "Jobs", href: "/dashboard/jobs" },
    { icon: History, label: "History", href: "/dashboard/history" },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

interface SidebarProps {
    user: {
        name?: string | null
        email?: string | null
        image?: string | null
    }
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()

    return (
        <div className="w-64 border-r bg-background h-screen flex flex-col hidden md:flex sticky top-0">
            <div className="h-16 flex items-center px-6 border-b">
                <h1 className="text-xl font-bold tracking-tight">Backup Manager</h1>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => (
                    <Button
                        key={item.href}
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", pathname === item.href && "font-semibold")}
                        asChild
                    >
                        <Link href={item.href}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Link>
                    </Button>
                ))}
            </nav>
            <div className="p-4 border-t">
                <UserNav user={user} />
            </div>
        </div>
    )
}
