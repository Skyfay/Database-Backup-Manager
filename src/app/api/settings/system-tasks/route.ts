import { NextRequest, NextResponse } from "next/server";
import { systemTaskService, SYSTEM_TASKS, DEFAULT_TASK_CONFIG } from "@/services/system-task-service";
import { getAuthContext, checkPermissionWithContext } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { headers } from "next/headers";
import { scheduler } from "@/lib/scheduler";
import { auditService } from "@/services/audit-service";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";

export async function GET(_req: NextRequest) {
    const ctx = await getAuthContext(await headers());
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    checkPermissionWithContext(ctx, PERMISSIONS.SETTINGS.READ); // assuming generic settings permission

    const tasks = [];
    for (const [_key, taskId] of Object.entries(SYSTEM_TASKS)) {
        const schedule = await systemTaskService.getTaskConfig(taskId);
        const runOnStartup = await systemTaskService.getTaskRunOnStartup(taskId);
        const enabled = await systemTaskService.getTaskEnabled(taskId);
        const config = DEFAULT_TASK_CONFIG[taskId];

        if (!config) continue;

        tasks.push({
            id: taskId,
            schedule,
            runOnStartup,
            enabled,
            label: config.label,
            description: config.description
        });
    }

    return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
    const ctx = await getAuthContext(await headers());
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    checkPermissionWithContext(ctx, PERMISSIONS.SETTINGS.WRITE);

    const body = await req.json();
    const { taskId, schedule, runOnStartup, enabled } = body;

    if (!taskId) {
         return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    if (schedule !== undefined) {
        await systemTaskService.setTaskConfig(taskId, schedule);
    }

    if (runOnStartup !== undefined) {
        await systemTaskService.setTaskRunOnStartup(taskId, runOnStartup);
    }

    if (enabled !== undefined) {
        await systemTaskService.setTaskEnabled(taskId, enabled);
    }

    // Refresh scheduler
    await scheduler.refresh();

    await auditService.log(
        ctx.userId,
        AUDIT_ACTIONS.UPDATE,
        AUDIT_RESOURCES.SYSTEM,
        { task: taskId, schedule, runOnStartup, enabled },
        taskId
    );

    return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
    // Run Task immediately manual trigger
    const ctx = await getAuthContext(await headers());
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    checkPermissionWithContext(ctx, PERMISSIONS.SETTINGS.WRITE);

    const body = await req.json();
    const { taskId } = body;

    if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

    // Run async
    systemTaskService.runTask(taskId);

    await auditService.log(
        ctx.userId,
        AUDIT_ACTIONS.EXECUTE,
        AUDIT_RESOURCES.SYSTEM,
        { task: taskId },
        taskId
    );

    return NextResponse.json({ success: true, message: "Task started" });
}
