"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface ApiKeyRevealDialogProps {
    rawKey: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Dialog shown after creating or rotating an API key.
 * Displays the raw key once and allows copying to clipboard.
 */
export function ApiKeyRevealDialog({ rawKey, open, onOpenChange }: ApiKeyRevealDialogProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        if (!rawKey) return
        try {
            await navigator.clipboard.writeText(rawKey)
            setCopied(true)
            toast.success("API key copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Failed to copy to clipboard")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>API Key Created</DialogTitle>
                    <DialogDescription>
                        Copy your API key now. You will not be able to see it again.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1">
                        <Input
                            readOnly
                            value={rawKey ?? ""}
                            className="font-mono text-sm border-0 bg-transparent focus-visible:ring-0"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                            Make sure to copy your API key now. For security reasons, it won&apos;t be displayed again.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
