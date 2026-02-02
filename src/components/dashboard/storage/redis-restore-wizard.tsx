"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Download,
    Server,
    RefreshCw,
    CheckCircle2,
    Circle,
    AlertTriangle,
    FileIcon,
    HardDrive,
    Copy,
    ChevronRight
} from "lucide-react";
import { FileInfo } from "@/app/dashboard/storage/columns";
import { formatBytes } from "@/lib/utils";
import { DateDisplay } from "@/components/utils/date-display";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RedisRestoreWizardProps {
    file: FileInfo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    destinationId: string;
}

type WizardStep = "intro" | "download" | "stop" | "replace" | "start" | "verify" | "complete";

const STEPS: { id: WizardStep; title: string; description: string }[] = [
    { id: "intro", title: "Overview", description: "Understand the restore process" },
    { id: "download", title: "Download Backup", description: "Get the RDB file" },
    { id: "stop", title: "Stop Redis", description: "Safely shut down the server" },
    { id: "replace", title: "Replace RDB", description: "Copy the backup file" },
    { id: "start", title: "Start Redis", description: "Restart the server" },
    { id: "verify", title: "Verify", description: "Confirm data restored" },
];

export function RedisRestoreWizard({ file, open, onOpenChange, destinationId }: RedisRestoreWizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>("intro");
    const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

    // Reset when dialog opens
    useEffect(() => {
        if (open) {
            setCurrentStep("intro");
            setCompletedSteps(new Set());
            setDownloadUrl(null);
        }
    }, [open]);

    const markStepComplete = (step: WizardStep) => {
        setCompletedSteps(prev => new Set([...prev, step]));
    };

    const goToNextStep = () => {
        const currentIndex = STEPS.findIndex(s => s.id === currentStep);
        if (currentIndex < STEPS.length - 1) {
            markStepComplete(currentStep);
            setCurrentStep(STEPS[currentIndex + 1].id);
        }
    };

    const goToPrevStep = () => {
        const currentIndex = STEPS.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1].id);
        }
    };

    const generateDownloadUrl = async () => {
        if (!file) return;
        setIsGeneratingUrl(true);
        try {
            const res = await fetch(`/api/storage/${destinationId}/download-url`, {
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

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-red-500" />
                        Redis Restore Wizard
                    </DialogTitle>
                    <DialogDescription>
                        Redis requires manual steps to restore. Follow this wizard carefully.
                    </DialogDescription>
                </DialogHeader>

                {/* File Info */}
                <div className="flex items-start gap-4 p-4 border rounded-lg bg-secondary/20">
                    <div className="p-2 rounded bg-background border shadow-sm">
                        <FileIcon className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="font-medium leading-none">{file.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" /> {formatBytes(file.size)}
                            </span>
                            <DateDisplay date={file.lastModified} className="text-xs" />
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Redis {file.engineVersion || "RDB"}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Step Progress */}
                <div className="flex items-center justify-between px-2 py-4">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => {
                                    if (completedSteps.has(step.id) || index <= currentStepIndex) {
                                        setCurrentStep(step.id);
                                    }
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-1 transition-colors",
                                    currentStep === step.id ? "text-primary" : "text-muted-foreground",
                                    (completedSteps.has(step.id) || index <= currentStepIndex) && "cursor-pointer hover:text-primary"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                                    currentStep === step.id && "border-primary bg-primary text-primary-foreground",
                                    completedSteps.has(step.id) && currentStep !== step.id && "border-green-500 bg-green-500 text-white",
                                    !completedSteps.has(step.id) && currentStep !== step.id && "border-muted-foreground/30"
                                )}>
                                    {completedSteps.has(step.id) && currentStep !== step.id ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <span className="text-xs font-medium">{index + 1}</span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium hidden sm:block">{step.title}</span>
                            </button>
                            {index < STEPS.length - 1 && (
                                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[200px] py-4">
                    {currentStep === "intro" && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Why is Redis restore different?</AlertTitle>
                                <AlertDescription className="mt-2 text-sm">
                                    Unlike SQL databases, Redis cannot load RDB files remotely via network commands.
                                    The RDB file must be physically placed on the Redis server and the server restarted.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-3">
                                <h4 className="font-medium">This wizard will guide you through:</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <Circle className="h-2 w-2 fill-current" />
                                        Downloading the backup file
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Circle className="h-2 w-2 fill-current" />
                                        Safely stopping your Redis server
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Circle className="h-2 w-2 fill-current" />
                                        Replacing the RDB file on your server
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Circle className="h-2 w-2 fill-current" />
                                        Restarting Redis to load the data
                                    </li>
                                </ul>
                            </div>

                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Data Loss Warning</AlertTitle>
                                <AlertDescription className="text-sm">
                                    This will completely replace all data in your Redis server.
                                    The current data will be permanently lost.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {currentStep === "download" && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Step 1: Download the Backup File</h4>
                            <p className="text-sm text-muted-foreground">
                                First, download the RDB backup file to your local machine or directly to your server.
                            </p>

                            <div className="flex flex-col gap-3">
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
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <span className="text-sm font-medium">Download link ready!</span>
                                            <Badge variant="outline" className="text-xs">Expires in 5 min</Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button asChild className="flex-1">
                                                <a href={downloadUrl} download>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download File
                                                </a>
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(downloadUrl)}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Or use wget/curl on your server (link is single-use):
                                        </p>
                                        <div className="relative">
                                            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                                                wget -O dump.rdb &quot;{downloadUrl}&quot;
                                            </pre>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6"
                                                onClick={() => copyToClipboard(`wget -O dump.rdb "${downloadUrl}"`)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === "stop" && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Step 2: Stop the Redis Server</h4>
                            <p className="text-sm text-muted-foreground">
                                Before replacing the RDB file, you must stop the Redis server to prevent data corruption.
                            </p>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Systemd (Linux):</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">sudo systemctl stop redis</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard("sudo systemctl stop redis")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Docker:</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">docker stop &lt;redis-container&gt;</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard("docker stop <redis-container>")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Redis CLI (Graceful shutdown):</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">redis-cli -a &lt;password&gt; SHUTDOWN SAVE</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard("redis-cli -a <password> SHUTDOWN SAVE")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    Make sure Redis is completely stopped before proceeding.
                                    You can verify by running: <code className="bg-muted px-1 rounded">redis-cli ping</code> (should fail)
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {currentStep === "replace" && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Step 3: Replace the RDB File</h4>
                            <p className="text-sm text-muted-foreground">
                                Copy the downloaded backup file to your Redis data directory, replacing the existing dump.rdb.
                            </p>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Linux (default path):</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">{`sudo cp ~/Downloads/${file.name} /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb`}</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard(`sudo cp ~/Downloads/${file.name} /var/lib/redis/dump.rdb\nsudo chown redis:redis /var/lib/redis/dump.rdb`)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Docker:</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">{`docker cp ~/Downloads/${file.name} <container>:/data/dump.rdb`}</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard(`docker cp ~/Downloads/${file.name} <container>:/data/dump.rdb`)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    <strong>Important:</strong> The file must be named exactly <code className="bg-muted px-1 rounded">dump.rdb</code>
                                    (or whatever is configured in your redis.conf as <code className="bg-muted px-1 rounded">dbfilename</code>).
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {currentStep === "start" && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Step 4: Start the Redis Server</h4>
                            <p className="text-sm text-muted-foreground">
                                Start Redis again. It will automatically load the new RDB file on startup.
                            </p>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Systemd (Linux):</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">sudo systemctl start redis</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard("sudo systemctl start redis")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Docker:</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">docker start &lt;redis-container&gt;</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard("docker start <redis-container>")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    Check the Redis logs to ensure no errors occurred during startup and RDB loading.
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStep === "verify" && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Step 5: Verify the Restore</h4>
                            <p className="text-sm text-muted-foreground">
                                Confirm that your data has been restored correctly.
                            </p>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Check connection and key count:</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">{`redis-cli -a <password> INFO keyspace`}</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard("redis-cli -a <password> INFO keyspace")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Sample some keys:</p>
                                    <div className="relative">
                                        <pre className="text-xs bg-muted p-3 rounded-md">{`redis-cli -a <password> KEYS "*" | head -20`}</pre>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => copyToClipboard('redis-cli -a <password> KEYS "*" | head -20')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="font-medium text-green-600 dark:text-green-400">Almost done!</p>
                                    <p className="text-sm text-muted-foreground">
                                        If your keys are visible and data looks correct, the restore was successful.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                        {currentStep !== "intro" && (
                            <Button variant="ghost" onClick={goToPrevStep}>
                                Back
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {currentStep === "verify" ? "Done" : "Cancel"}
                        </Button>
                        {currentStep !== "verify" && (
                            <Button onClick={goToNextStep}>
                                {currentStep === "intro" ? "Start Wizard" : "I've Completed This Step"}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                        {currentStep === "verify" && (
                            <Button onClick={() => onOpenChange(false)} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Complete Restore
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
