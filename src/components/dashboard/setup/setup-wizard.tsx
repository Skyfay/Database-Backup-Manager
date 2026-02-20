"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Rocket,
    Database,
    HardDrive,
    Lock,
    Bell,
    CalendarClock,
    CheckCircle2,
    Circle,
    ChevronRight,
    PartyPopper,
} from "lucide-react";
import { ADAPTER_DEFINITIONS } from "@/lib/adapters/definitions";
import { WelcomeStep } from "./steps/welcome-step";
import { SourceStep } from "./steps/source-step";
import { DestinationStep } from "./steps/destination-step";
import { VaultStep } from "./steps/vault-step";
import { NotificationStep } from "./steps/notification-step";
import { JobStep } from "./steps/job-step";
import { CompleteStep } from "./steps/complete-step";

// Wizard state shared across steps
export interface WizardData {
    sourceId: string | null;
    sourceName: string | null;
    destinationId: string | null;
    destinationName: string | null;
    encryptionProfileId: string | null;
    encryptionProfileName: string | null;
    notificationIds: string[];
    notificationNames: string[];
    jobId: string | null;
    jobName: string | null;
}

type WizardStepId =
    | "welcome"
    | "source"
    | "destination"
    | "vault"
    | "notification"
    | "job"
    | "complete";

interface StepDefinition {
    id: WizardStepId;
    title: string;
    description: string;
    icon: React.ElementType;
    optional?: boolean;
}

interface SetupWizardProps {
    canCreateVault: boolean;
    canCreateNotification: boolean;
}

export function SetupWizard({
    canCreateVault,
    canCreateNotification,
}: SetupWizardProps) {
    // Import adapter definitions client-side (Zod schemas are not serializable across Server→Client boundary)
    const databaseAdapters = useMemo(() => ADAPTER_DEFINITIONS.filter((a) => a.type === "database"), []);
    const storageAdapters = useMemo(() => ADAPTER_DEFINITIONS.filter((a) => a.type === "storage"), []);
    const notificationAdapters = useMemo(() => ADAPTER_DEFINITIONS.filter((a) => a.type === "notification"), []);
    // Build dynamic step list based on permissions
    const steps: StepDefinition[] = useMemo(() => [
        { id: "welcome", title: "Welcome", description: "Get started", icon: Rocket },
        { id: "source", title: "Database Source", description: "Where to backup from", icon: Database },
        { id: "destination", title: "Storage Destination", description: "Where to store backups", icon: HardDrive },
        ...(canCreateVault
            ? [{ id: "vault" as const, title: "Encryption", description: "Secure your backups", icon: Lock, optional: true }]
            : []),
        ...(canCreateNotification
            ? [{ id: "notification" as const, title: "Notifications", description: "Get alerts", icon: Bell, optional: true }]
            : []),
        { id: "job", title: "Backup Job", description: "Configure schedule", icon: CalendarClock },
        { id: "complete", title: "Done!", description: "Ready to go", icon: PartyPopper },
    ], [canCreateVault, canCreateNotification]);

    const [currentStepId, setCurrentStepId] = useState<WizardStepId>("welcome");
    const [completedSteps, setCompletedSteps] = useState<Set<WizardStepId>>(new Set());
    const [wizardData, setWizardData] = useState<WizardData>({
        sourceId: null,
        sourceName: null,
        destinationId: null,
        destinationName: null,
        encryptionProfileId: null,
        encryptionProfileName: null,
        notificationIds: [],
        notificationNames: [],
        jobId: null,
        jobName: null,
    });

    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);

    const markComplete = useCallback((stepId: WizardStepId) => {
        setCompletedSteps((prev) => new Set([...prev, stepId]));
    }, []);

    const goToNext = useCallback(() => {
        const idx = steps.findIndex((s) => s.id === currentStepId);
        if (idx < steps.length - 1) {
            markComplete(currentStepId);
            setCurrentStepId(steps[idx + 1].id);
        }
    }, [currentStepId, steps, markComplete]);

    const goToPrev = useCallback(() => {
        const idx = steps.findIndex((s) => s.id === currentStepId);
        if (idx > 0) {
            setCurrentStepId(steps[idx - 1].id);
        }
    }, [currentStepId, steps]);

    const goToStep = useCallback(
        (stepId: WizardStepId) => {
            const targetIdx = steps.findIndex((s) => s.id === stepId);
            // Allow navigating to completed steps or the next uncompleted one
            if (targetIdx <= currentStepIndex || completedSteps.has(stepId)) {
                setCurrentStepId(stepId);
            }
        },
        [steps, currentStepIndex, completedSteps]
    );

    const updateData = useCallback((partial: Partial<WizardData>) => {
        setWizardData((prev) => ({ ...prev, ...partial }));
    }, []);

    const skipStep = useCallback(() => {
        goToNext();
    }, [goToNext]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Quick Setup</h2>
                <p className="text-muted-foreground">
                    Configure your first backup in just a few steps.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar - Step Navigation */}
                <div className="lg:w-64 shrink-0">
                    <Card>
                        <CardContent className="p-4">
                            <nav className="space-y-1">
                                {steps.map((step, idx) => {
                                    const isCompleted = completedSteps.has(step.id);
                                    const isCurrent = step.id === currentStepId;
                                    const isAccessible =
                                        idx <= currentStepIndex || isCompleted;

                                    return (
                                        <button
                                            key={step.id}
                                            onClick={() => goToStep(step.id)}
                                            disabled={!isAccessible}
                                            className={cn(
                                                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                                isCurrent && "bg-primary/10 text-primary",
                                                isCompleted && !isCurrent && "text-muted-foreground",
                                                !isCurrent && !isCompleted && "text-muted-foreground/60",
                                                isAccessible && !isCurrent && "hover:bg-muted cursor-pointer",
                                                !isAccessible && "cursor-not-allowed opacity-50"
                                            )}
                                        >
                                            <div className="shrink-0">
                                                {isCompleted && !isCurrent ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : isCurrent ? (
                                                    <ChevronRight className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Circle className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            "text-sm font-medium truncate",
                                                            isCurrent && "text-primary"
                                                        )}
                                                    >
                                                        {step.title}
                                                    </span>
                                                    {step.optional && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                                            Optional
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground truncate block">
                                                    {step.description}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </nav>
                        </CardContent>
                    </Card>

                    {/* Progress indicator */}
                    <div className="mt-4 px-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>
                                {completedSteps.size} / {steps.length - 1}
                            </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{
                                    width: `${(completedSteps.size / (steps.length - 1)) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <Card>
                        <CardContent className="p-6">
                            {currentStepId === "welcome" && (
                                <WelcomeStep onNext={goToNext} steps={steps} />
                            )}

                            {currentStepId === "source" && (
                                <SourceStep
                                    adapters={databaseAdapters}
                                    wizardData={wizardData}
                                    onUpdate={updateData}
                                    onNext={goToNext}
                                    onPrev={goToPrev}
                                />
                            )}

                            {currentStepId === "destination" && (
                                <DestinationStep
                                    adapters={storageAdapters}
                                    wizardData={wizardData}
                                    onUpdate={updateData}
                                    onNext={goToNext}
                                    onPrev={goToPrev}
                                />
                            )}

                            {currentStepId === "vault" && (
                                <VaultStep
                                    wizardData={wizardData}
                                    onUpdate={updateData}
                                    onNext={goToNext}
                                    onPrev={goToPrev}
                                    onSkip={skipStep}
                                />
                            )}

                            {currentStepId === "notification" && (
                                <NotificationStep
                                    adapters={notificationAdapters}
                                    wizardData={wizardData}
                                    onUpdate={updateData}
                                    onNext={goToNext}
                                    onPrev={goToPrev}
                                    onSkip={skipStep}
                                />
                            )}

                            {currentStepId === "job" && (
                                <JobStep
                                    wizardData={wizardData}
                                    onUpdate={updateData}
                                    onNext={goToNext}
                                    onPrev={goToPrev}
                                />
                            )}

                            {currentStepId === "complete" && (
                                <CompleteStep wizardData={wizardData} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
