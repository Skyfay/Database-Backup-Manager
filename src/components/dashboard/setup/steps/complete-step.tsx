"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    PartyPopper,
    Database,
    HardDrive,
    Lock,
    Bell,
    CalendarClock,
    Play,
    LayoutDashboard,
    Settings,
} from "lucide-react";
import { WizardData } from "../setup-wizard";

interface CompleteStepProps {
    wizardData: WizardData;
}

export function CompleteStep({ wizardData }: CompleteStepProps) {
    const handleRunNow = async () => {
        if (!wizardData.jobId) return;
        try {
            const res = await fetch(`/api/jobs/${wizardData.jobId}/run`, {
                method: "POST",
            });
            if (res.ok) {
                // Open job history
                window.location.href = "/dashboard/history";
            }
        } catch {
            // Silently fail, user can run manually
        }
    };

    return (
        <div className="space-y-8">
            {/* Success header */}
            <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <PartyPopper className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold">Setup Complete!</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Your automated backup is configured and ready to go.
                    Here&apos;s a summary of everything that was set up.
                </p>
            </div>

            {/* Summary */}
            <Card className="max-w-lg mx-auto">
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <span className="text-sm text-muted-foreground">Database Source</span>
                            <p className="font-medium">{wizardData.sourceName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <HardDrive className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <span className="text-sm text-muted-foreground">Storage Destination</span>
                            <p className="font-medium">{wizardData.destinationName}</p>
                        </div>
                    </div>

                    {wizardData.encryptionProfileName && (
                        <div className="flex items-center gap-3">
                            <Lock className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <span className="text-sm text-muted-foreground">Encryption</span>
                                <p className="font-medium">{wizardData.encryptionProfileName}</p>
                            </div>
                        </div>
                    )}

                    {wizardData.notificationNames.length > 0 && (
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <span className="text-sm text-muted-foreground">Notifications</span>
                                <p className="font-medium">{wizardData.notificationNames.join(", ")}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <CalendarClock className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <span className="text-sm text-muted-foreground">Backup Job</span>
                            <p className="font-medium">{wizardData.jobName}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Next actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
                {wizardData.jobId && (
                    <Button onClick={handleRunNow} className="flex-1">
                        <Play className="mr-2 h-4 w-4" />
                        Run First Backup Now
                    </Button>
                )}
                <Button variant="outline" className="flex-1" asChild>
                    <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Go to Dashboard
                    </Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                    <Link href="/dashboard/jobs">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Jobs
                    </Link>
                </Button>
            </div>
        </div>
    );
}
