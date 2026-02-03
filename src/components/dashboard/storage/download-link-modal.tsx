"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Download,
    Copy,
    CheckCircle2,
    RefreshCw,
    Terminal,
    ExternalLink,
    Clock,
    FileIcon,
    HardDrive,
    FileLock2,
    FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";

interface DownloadLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storageId: string;
    file: {
        name: string;
        path: string;
        size: number;
        isEncrypted?: boolean;
    };
}

type DownloadMode = "encrypted" | "decrypted";

export function DownloadLinkModal({
    open,
    onOpenChange,
    storageId,
    file,
}: DownloadLinkModalProps) {
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [mode, setMode] = useState<DownloadMode>(file.isEncrypted ? "decrypted" : "encrypted");
    const [copied, setCopied] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);

    // Reset state when dialog opens or file changes
    useEffect(() => {
        if (open) {
            setDownloadUrl(null);
            setMode(file.isEncrypted ? "decrypted" : "encrypted");
            setCopied(null);
            setExpiresAt(null);
        }
    }, [open, file]);

    // Countdown timer for expiration
    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining === 0) {
                setDownloadUrl(null);
                setExpiresAt(null);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const generateDownloadUrl = useCallback(async () => {
        setIsGenerating(true);
        try {
            const decrypt = mode === "decrypted";
            const res = await fetch(`/api/storage/${storageId}/download-url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: file.path, decrypt }),
            });

            if (res.ok) {
                const data = await res.json();
                setDownloadUrl(data.url);
                setExpiresAt(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes from now
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to generate download URL");
            }
        } catch {
            toast.error("Failed to generate download URL");
        } finally {
            setIsGenerating(false);
        }
    }, [storageId, file.path, mode]);

    const copyToClipboard = useCallback((text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(null), 2000);
    }, []);

    // Compute output filename
    const getOutputFilename = useCallback(() => {
        let filename = file.name;
        if (mode === "decrypted" && filename.endsWith(".enc")) {
            filename = filename.slice(0, -4);
        }
        return filename;
    }, [file.name, mode]);

    const outputFilename = getOutputFilename();
    const wgetCommand = downloadUrl ? `wget -O "${outputFilename}" "${downloadUrl}"` : "";
    const curlCommand = downloadUrl ? `curl -o "${outputFilename}" "${downloadUrl}"` : "";

    const formatTimeLeft = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Generate Download Link
                    </DialogTitle>
                    <DialogDescription>
                        Generate a temporary URL for downloading via wget or curl.
                    </DialogDescription>
                </DialogHeader>

                {/* File Info */}
                <div className="flex items-start gap-4 p-4 border rounded-lg bg-secondary/20">
                    <div className="p-2 rounded bg-background border shadow-sm">
                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="font-medium leading-none text-sm truncate" title={file.name}>
                            {file.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" /> {formatBytes(file.size)}
                            </span>
                            {file.isEncrypted && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                    <FileLock2 className="h-3 w-3 mr-1" />
                                    Encrypted
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mode Selection (only for encrypted files) */}
                {file.isEncrypted && (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Download Format</Label>
                        <RadioGroup
                            value={mode}
                            onValueChange={(v) => {
                                setMode(v as DownloadMode);
                                setDownloadUrl(null); // Reset URL when mode changes
                            }}
                            className="grid grid-cols-2 gap-3"
                        >
                            <Label
                                htmlFor="decrypted"
                                className={cn(
                                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                                    mode === "decrypted" && "border-primary bg-primary/5"
                                )}
                            >
                                <RadioGroupItem value="decrypted" id="decrypted" />
                                <FileCheck className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Decrypted</span>
                            </Label>
                            <Label
                                htmlFor="encrypted"
                                className={cn(
                                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                                    mode === "encrypted" && "border-primary bg-primary/5"
                                )}
                            >
                                <RadioGroupItem value="encrypted" id="encrypted" />
                                <FileLock2 className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">Encrypted (.enc)</span>
                            </Label>
                        </RadioGroup>
                    </div>
                )}

                {/* Generate / URL Display */}
                {!downloadUrl ? (
                    <Button
                        onClick={generateDownloadUrl}
                        disabled={isGenerating}
                        className="w-full"
                    >
                        {isGenerating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Generate Download Link
                    </Button>
                ) : (
                    <div className="space-y-4">
                        {/* Success Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="text-sm font-medium">Link generated!</span>
                            </div>
                            <Badge
                                variant={timeLeft <= 60 ? "destructive" : "outline"}
                                className="text-xs"
                            >
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTimeLeft(timeLeft)}
                            </Badge>
                        </div>

                        {/* Direct Download */}
                        <div className="flex gap-2">
                            <Button asChild className="flex-1">
                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download in Browser
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(downloadUrl, "url")}
                            >
                                {copied === "url" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {/* wget Command */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-2">
                                <Terminal className="h-3 w-3" />
                                wget command
                            </Label>
                            <div className="relative">
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all pr-10 font-mono">
                                    {wgetCommand}
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-7 w-7"
                                    onClick={() => copyToClipboard(wgetCommand, "wget")}
                                >
                                    {copied === "wget" ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* curl Command */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-2">
                                <Terminal className="h-3 w-3" />
                                curl command
                            </Label>
                            <div className="relative">
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all pr-10 font-mono">
                                    {curlCommand}
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-7 w-7"
                                    onClick={() => copyToClipboard(curlCommand, "curl")}
                                >
                                    {copied === "curl" ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Regenerate Button */}
                        <Button
                            variant="outline"
                            onClick={generateDownloadUrl}
                            disabled={isGenerating}
                            className="w-full"
                        >
                            {isGenerating ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Generate New Link
                        </Button>

                        {/* Info */}
                        <p className="text-xs text-muted-foreground text-center">
                            Link is single-use and expires in 5 minutes.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
