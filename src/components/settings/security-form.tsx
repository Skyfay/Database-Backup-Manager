"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function SecurityForm() {
    const { data: session } = authClient.useSession()
    const [isPending, setIsPending] = useState(false)
    const [totpURI, setTotpURI] = useState<string | null>(null)
    const [verificationCode, setVerificationCode] = useState("")
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [showBackupCodes, setShowBackupCodes] = useState(false)
    const [password, setPassword] = useState("")
    const [isDisabling, setIsDisabling] = useState(false)

    // Check if 2FA is enabled from session
    const isTwoFactorEnabled = session?.user?.twoFactorEnabled

    const handleEnable2FA = async () => {
        setIsPending(true)
        try {
            const result = await authClient.twoFactor.enable({
                password: password // Better-Auth requires password to enable 2FA usually, or we can just get the secret first?
                                   // Actually client.twoFactor.enable({ password }) returns data...
                                   // Let's assume we need to prompt for password first if not passed,
                                   // but the library might handle it.
                                   // Wait, better-auth docs say: enable({ password: ... }) returns Promise<{ totpURI: string, backupCodes: string[] } | { error: ... }>
            })

            if (result.error) {
                toast.error(result.error.message)
                return
            }

            if (result.data) {
                setTotpURI(result.data.totpURI)
                setBackupCodes(result.data.backupCodes || [])
            }
        } catch (error) {
            console.error(error)
            toast.error("Ein Fehler ist aufgetreten")
        } finally {
            setIsPending(false)
        }
    }

    const handleVerifyTOTP = async () => {
        setIsPending(true)
        try {
            const result = await authClient.twoFactor.verifyTotp({
                code: verificationCode
            })

            if (result.error) {
                toast.error(result.error.message)
                return
            }

            toast.success("Zwei-Faktor-Authentifizierung wurde aktiviert")
            setTotpURI(null)
            setShowBackupCodes(true)
        } catch (error) {
           console.error(error)
           toast.error("Verifizierung fehlgeschlagen")
        } finally {
            setIsPending(false)
        }
    }

    const handleDisable2FA = async () => {
        setIsDisabling(true)
        try {
            // Usually requires password again?
            // checking docs: disable({ password, ... })
             const result = await authClient.twoFactor.disable({
                password: password
            })

            if (result.error) {
                toast.error(result.error.message)
                return
            }

            toast.success("Zwei-Faktor-Authentifizierung deaktiviert")
        } catch (error) {
            toast.error("Fehler beim Deaktivieren")
        } finally {
            setIsDisabling(false)
            setPassword("")
        }
    }

    if (!session) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sicherheit</CardTitle>
                <CardDescription>
                    Verwalten Sie Ihre Sicherheitseinstellungen und die Zwei-Faktor-Authentifizierung.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                        <Label className="text-base">Zwei-Faktor-Authentifizierung (2FA)</Label>
                        <p className="text-sm text-muted-foreground">
                            Erhöhen Sie die Sicherheit Ihres Kontos durch einen zweiten Bestätigungsschritt.
                        </p>
                    </div>
                    {isTwoFactorEnabled ? (
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isDisabling}>
                                    {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Deaktivieren
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>2FA Deaktivieren</DialogTitle>
                                    <DialogDescription>
                                        Bitte geben Sie Ihr Passwort ein, um die Zwei-Faktor-Authentifizierung zu deaktivieren.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 py-4">
                                    <Label htmlFor="password-disable">Passwort</Label>
                                    <Input
                                        id="password-disable"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setPassword("")}>Abbrechen</Button>
                                    <Button variant="destructive" onClick={handleDisable2FA} disabled={!password || isDisabling}>
                                        Deaktivieren
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Dialog>
                             <DialogTrigger asChild>
                                <Button variant="default" size="sm">
                                    Aktivieren
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>2FA Einrichten</DialogTitle>
                                    <DialogDescription>
                                       Schützen Sie Ihr Konto in zwei Schritten.
                                    </DialogDescription>
                                </DialogHeader>

                                {!totpURI && !showBackupCodes && (
                                    <div className="space-y-4 py-4">
                                        <p className="text-sm">Geben Sie Ihr Passwort ein, um die Einrichtung zu starten.</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="password-enable">Passwort</Label>
                                            <Input
                                                id="password-enable"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={handleEnable2FA} disabled={!password || isPending} className="w-full">
                                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Fortfahren
                                        </Button>
                                    </div>
                                )}

                                {totpURI && !showBackupCodes && (
                                    <div className="space-y-4 py-4">
                                        <div className="flex justify-center p-4 bg-white rounded-lg">
                                            <QRCodeSVG value={totpURI} size={150} />
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            Scannen Sie diesen QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator, Authy).
                                        </p>
                                        <div className="space-y-2">
                                            <Label htmlFor="code">Verifizierungs-Code</Label>
                                            <Input
                                                id="code"
                                                placeholder="123456"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="text-center text-lg tracking-widest"
                                            />
                                        </div>
                                         <Button onClick={handleVerifyTOTP} disabled={verificationCode.length !== 6 || isPending} className="w-full">
                                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Verifizieren & Aktivieren
                                        </Button>
                                    </div>
                                )}

                                {showBackupCodes && (
                                     <div className="space-y-4 py-4">
                                        <div className="flex items-center gap-2 text-green-600 mb-2">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="font-medium">2FA erfolgreich aktiviert!</span>
                                        </div>
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Backup-Codes</AlertTitle>
                                            <AlertDescription>
                                                Speichern Sie diese Codes sicher ab. Sie können verwendet werden, wenn Sie Zugriff auf Ihr Gerät verlieren.
                                            </AlertDescription>
                                        </Alert>
                                        <div className="grid grid-cols-2 gap-2 mt-4 bg-muted p-4 rounded-md font-mono text-sm">
                                            {backupCodes.map((code, i) => (
                                                <div key={i} className="text-center select-all">{code}</div>
                                            ))}
                                        </div>
                                        <Button className="w-full" onClick={() => setShowBackupCodes(false)}>
                                            Fertig
                                        </Button>
                                     </div>
                                )}

                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
