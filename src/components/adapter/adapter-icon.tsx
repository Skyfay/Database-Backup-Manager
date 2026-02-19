"use client";

import { Icon } from "@iconify/react";
import { getAdapterIcon, getAdapterColor } from "./utils";

interface AdapterIconProps {
    adapterId: string;
    className?: string;
}

/**
 * Renders the appropriate brand/generic icon for an adapter.
 *
 * Icons are bundled (no API calls) — works fully offline.
 * - logos/*         → Multi-colored SVG (color embedded)
 * - simple-icons/*  → Monochrome SVG (brand color auto-applied)
 * - lucide/*        → Stroke icon (inherits currentColor)
 */
export function AdapterIcon({ adapterId, className }: AdapterIconProps) {
    const iconData = getAdapterIcon(adapterId);
    const color = getAdapterColor(adapterId);

    return (
        <Icon
            icon={iconData}
            className={className}
            {...(color ? { style: { color } } : {})}
        />
    );
}
