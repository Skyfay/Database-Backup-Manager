"use client"

import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import React from "react"

export function Header() {
    const pathname = usePathname()
    // Split path, filtering empty strings
    const segments = pathname.split('/').filter(Boolean)

    const segmentMap: Record<string, string> = {
        "users": "Users & Groups"
    }

    return (
        <header className="border-b h-16 flex items-center px-6 bg-background sticky top-0 z-10">
            <nav className="flex items-center text-sm text-muted-foreground">
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1
                    const href = `/${segments.slice(0, index + 1).join('/')}`

                    // Capitalize first letter or use map
                    const name = segmentMap[segment] || (segment.charAt(0).toUpperCase() + segment.slice(1))

                    return (
                        <React.Fragment key={href}>
                            {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />}
                            {isLast ? (
                                <span className="font-medium text-foreground">{name}</span>
                            ) : (
                                <Link href={href} className="hover:text-foreground transition-colors">
                                    {name}
                                </Link>
                            )}
                        </React.Fragment>
                    )
                })}
            </nav>
        </header>
    )
}
