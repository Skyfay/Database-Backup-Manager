"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setupTwoFactor, confirmTwoFactor, disableTwoFactor } from "@/actions/security"
import { toast } from "sonner"
import Image from "next/image"

interface SecurityFormProps {
    isTwoFactorEnabled: boolean
}

export function SecurityForm({ isTwoFactorEnabled }: SecurityFormProps) {
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [secret, setSecret] = useState<string | null>(null)
    const [token, setToken] = useState("")
    const [isSetupOpen, setIsSetupOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSetup = async () => {
        setLoading(true)
        const res = await setupTwoFactor()
        if (res.error) {
            toast.error(res.error)
        } else if (res.qrCode && res.secret) {
            setQrCode(res.qrCode)
            setSecret(res.secret)
            setIsSetupOpen(true)
        }
        setLoading(false)
    }

    const handleVerify = async () => {
        setLoading(true)
        const res = await confirmTwoFactor(token)
        if (res.error) {
            toast.error(res.error)
        } else if (res.success) {
            toast.success(res.success)
            setIsSetupOpen(false)
            setQrCode(null)
            setSecret(null)
            setToken("")
            // Force reload to update server component state if needed, or rely on router refresh
        }
        setLoading(false)
    }

    const handleDisable = async () => {
         if(!confirm("Are you sure you want to disable 2FA?")) return;

         setLoading(true)
         const res = await disableTwoFactor()
         if (res.error) {
             toast.error(res.error)
         } else if (res.success) {
             toast.success(res.success)
         }
         setLoading(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                    Add an extra layer of security to your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Authenticator App</Label>
                        <p className="text-sm text-muted-foreground">
                            Use an app like Google Authenticator or Authy.
                        </p>
                    </div>
                    {isTwoFactorEnabled ? (
                        <div className="flex items-center gap-2">
                             <span className="text-sm font-medium text-green-600 dark:text-green-400">Enabled</span>
                             <Button variant="destructive" size="sm" onClick={handleDisable} disabled={loading}>Disable</Button>
                        </div>
                    ) : (
                         <Button onClick={handleSetup} disabled={loading}>Setup</Button>
                    )}
                </div>
            </CardContent>

            <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan the QR code below with your authenticator app.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {qrCode && (
                            <div className="border p-2 bg-white rounded-md">
                                <Image src={qrCode} alt="QR Code" width={200} height={200} className="dark:mix-blend-normal" />
                            </div>
                        )}
                        {secret && (
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">Or enter code manually:</p>
                                <code className="bg-muted px-2 py-1 rounded text-sm">{secret}</code>
                            </div>
                        )}
                        <div className="w-full space-y-2">
                            <Label htmlFor="token">Verification Code</Label>
                            <Input
                                id="token"
                                placeholder="123456"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                maxLength={6}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSetupOpen(false)}>Cancel</Button>
                        <Button onClick={handleVerify} disabled={!token || token.length !== 6 || loading}>
                            Verify & Enable
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
