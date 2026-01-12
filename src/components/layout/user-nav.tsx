"use client"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    ChevronsUpDown,
    LogOut,
    Sparkles,
    User,
    Settings
} from "lucide-react"
import { logout } from "@/actions/auth"
import Link from "next/link"

interface UserNavProps {
    user: {
        name?: string | null
        email?: string | null
        image?: string | null
    }
}

export function UserNav({ user }: UserNavProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex w-full items-center gap-3 rounded-lg border p-3 shadow-sm bg-card hover:bg-accent transition-colors outline-none cursor-pointer"
                >
                    <Avatar className="h-9 w-9 rounded-full bg-primary/20 text-primary font-bold">
                        <AvatarImage src={user.image || ""} alt={user.name || ""} />
                        <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="text-sm font-medium truncate w-full text-left">{user.name || "User"}</span>
                        <span className="text-xs text-muted-foreground truncate w-full text-left">{user.email}</span>
                    </div>
                     <ChevronsUpDown className="ml-auto size-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">
                             <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
