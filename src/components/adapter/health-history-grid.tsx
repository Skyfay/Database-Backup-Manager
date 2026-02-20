"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HealthLog {
    id: string;
    status: "ONLINE" | "DEGRADED" | "OFFLINE";
    latencyMs: number;
    createdAt: string;
    error?: string;
}

interface HealthHistoryData {
    history: HealthLog[];
    stats: {
        uptime: number;
        avgLatency: number;
        totalChecks: number;
    };
}

interface HealthHistoryGridProps {
    adapterId: string;
}

export function HealthHistoryGrid({ adapterId }: HealthHistoryGridProps) {
    const [data, setData] = useState<HealthHistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/adapters/${adapterId}/health-history?limit=60`); // Last hour approx if 1 check/min
                if (!res.ok) throw new Error("Failed");
                const json = await res.json();
                // Reverse history for display (Oldest -> Newest)
                json.history = json.history.reverse();
                setData(json);
            } catch (_e) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [adapterId]);

    if (loading) {
        return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
    }

    if (error || !data) {
        return <div className="text-center py-4 text-sm text-red-500 flex flex-col items-center gap-1"><AlertCircle className="h-4 w-4" /> Failed to load history</div>;
    }

    // Grid Display
    // We want to show a series of boxes.
    // If we have 60 items, 10 per row => 6 rows? Or just one long flexible list?
    // Let's do a flex-wrap grid.

    return (
        <div className="space-y-4">
             <div className="grid grid-cols-2 gap-2 text-sm text-center">
                <div className="bg-muted/30 p-2 rounded-md">
                    <p className="text-xs text-muted-foreground">Uptime (Last 60)</p>
                    <p className="font-semibold">{data.stats.uptime}%</p>
                </div>
                <div className="bg-muted/30 p-2 rounded-md">
                    <p className="text-xs text-muted-foreground">Avg Latency</p>
                    <p className="font-semibold">{data.stats.avgLatency}ms</p>
                </div>
            </div>

            <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">History (Last ~1 Hour)</p>
                <div className="flex flex-wrap gap-1">
                    {data.history.map((log) => (
                        <LogPoint key={log.id} log={log} />
                    ))}
                    {data.history.length === 0 && <span className="text-xs text-muted-foreground italic">No data recorded yet.</span>}
                </div>
            </div>
        </div>
    );
}

function LogPoint({ log }: { log: HealthLog }) {
    const color = {
        ONLINE: "bg-green-500 hover:bg-green-600",
        DEGRADED: "bg-orange-500 hover:bg-orange-600",
        OFFLINE: "bg-red-500 hover:bg-red-600",
    }[log.status];

    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className={cn("h-3 w-3 rounded-sm cursor-help transition-colors", color)} />
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                    <p className="font-semibold">{format(new Date(log.createdAt), "HH:mm:ss")}</p>
                    <p>Status: {log.status}</p>
                    <p>Latency: {log.latencyMs}ms</p>
                    {log.error && <p className="text-red-400 max-w-50 wrap-break-word mt-1">{log.error}</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
