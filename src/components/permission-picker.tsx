"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AVAILABLE_PERMISSIONS } from "@/lib/permissions"

interface PermissionPickerProps {
  /** Currently selected permission IDs */
  value: string[]
  /** Callback when selection changes */
  onChange: (permissions: string[]) => void
  /** Optional height for the scroll area (default: 300px) */
  height?: string
  /** Prefix for checkbox IDs to avoid conflicts when multiple pickers are on the same page */
  idPrefix?: string
  /** Whether the picker is disabled */
  disabled?: boolean
}

/**
 * Reusable permission picker component.
 * Renders all available permissions grouped by category with toggle-all functionality.
 */
export function PermissionPicker({
  value,
  onChange,
  height = "300px",
  idPrefix = "perm",
  disabled = false,
}: PermissionPickerProps) {
  // Group permissions by category
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, typeof AVAILABLE_PERMISSIONS>
  )

  const toggleCategory = (category: string) => {
    const categoryPermissions = groupedPermissions[category].map((p) => p.id)
    const allSelected = categoryPermissions.every((p) => value.includes(p))

    if (allSelected) {
      onChange(value.filter((p) => !categoryPermissions.includes(p as typeof AVAILABLE_PERMISSIONS[number]["id"])))
    } else {
      const newPermissions = [...new Set([...value, ...categoryPermissions])]
      onChange(newPermissions)
    }
  }

  const togglePermission = (permissionId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, permissionId])
    } else {
      onChange(value.filter((v) => v !== permissionId))
    }
  }

  return (
    <ScrollArea className="border rounded-md p-4" style={{ height }}>
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, permissions]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-foreground/80">{category}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => toggleCategory(category)}
                disabled={disabled}
              >
                Toggle All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((permission) => (
                <label
                  key={permission.id}
                  htmlFor={`${idPrefix}-${permission.id}`}
                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <Checkbox
                    id={`${idPrefix}-${permission.id}`}
                    checked={value.includes(permission.id)}
                    onCheckedChange={(checked) =>
                      togglePermission(permission.id, !!checked)
                    }
                    disabled={disabled}
                  />
                  <div className="space-y-1 leading-none">
                    <span className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {permission.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
