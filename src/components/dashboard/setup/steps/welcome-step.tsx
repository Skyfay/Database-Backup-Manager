"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Rocket,
    ArrowRight,
} from "lucide-react";

interface StepDef {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    optional?: boolean;
}

interface WelcomeStepProps {
    onNext: () => void;
    steps: StepDef[];
}

export function WelcomeStep({ onNext, steps }: WelcomeStepProps) {
    // Filter out welcome and complete steps for the overview
    const setupSteps = steps.filter((s) => s.id !== "welcome" && s.id !== "complete");

    return (
        <div className="space-y-8">
            <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Welcome to Quick Setup</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    This wizard will guide you through setting up your first automated database backup.
                    In just a few steps, you&apos;ll have everything configured and ready to go.
                </p>
            </div>

            <div className="grid gap-3 max-w-lg mx-auto">
                {setupSteps.map((step, idx) => (
                    <div
                        key={step.id}
                        className="flex items-center gap-4 rounded-lg border p-4"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold shrink-0">
                            {idx + 1}
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{step.title}</span>
                                    {step.optional && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            Optional
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {step.description}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-4">
                <Button size="lg" onClick={onNext}>
                    Let&apos;s get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
