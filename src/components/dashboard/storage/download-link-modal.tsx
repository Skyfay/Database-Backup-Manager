import { useState, useEffect } from "react";
import { Download, Copy, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileInfo } from "@/app/dashboard/storage/columns";

interface DownloadLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: FileInfo | null;
    storageId: string;
}

export function DownloadLinkModal({ open, onOpenChange, file, storageId }: DownloadLinkModalProps) {
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

    // Reset state when file changes or modal opens/closes
    useEffect(() => {
        if (!open) {
            setDownloadUrl(null);
        }
    }, [open]);

    const generateDownloadUrl = async () => {
        if (!file || !storageId) return;
        setIsGeneratingUrl(true);
        try {
            const res = await fetch(`/api/storage/${storageId}/download-url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: file.path })
            });
            if (res.ok) {
                const data = await res.json();
                setDownloadUrl(data.url);
            } else {
                toast.error("Failed to generate download URL");
            }
        } catch {
            toast.error("Failed to generate download URL");
        } finally {
            setIsGeneratingUrl(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    if (!file) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Temporary Download Link</DialogTitle>
                    <DialogDescription>
                        Generate a secure link to download <strong>{file.name}</strong> via curl or wget.
                        This link will expire in 5 minutes.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    {!downloadUrl ? (
                        <Button onClick={generateDownloadUrl} disabled={isGeneratingUrl} className="w-full">
                            {isGeneratingUrl ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Generate Download Link
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-md border border-green-200 dark:border-green-900">
                                <CheckCircle2 className="h-5 w-5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Link generated!</p>
                                    <p className="text-xs opacity-90">Valid for 5 minutes (single use)</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Direct Link</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 truncate leading-6">
                                            {downloadUrl}
                                        </div>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(downloadUrl)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Wget Command</Label>
                                <div className="relative">
                                    <div className="text-xs bg-muted p-3 rounded-md break-all pr-8 font-mono border border-input">
                                        {`wget -O "${file.name}" "${downloadUrl}"`}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1.5 right-1.5 h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => copyToClipboard(`wget -O "${file.name}" "${downloadUrl}"`)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Curl Command</Label>
                                <div className="relative">
                                    <div className="text-xs bg-muted p-3 rounded-md break-all pr-8 font-mono border border-input">
                                        {`curl -o "${file.name}" "${downloadUrl}"`}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1.5 right-1.5 h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => copyToClipboard(`curl -o "${file.name}" "${downloadUrl}"`)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
