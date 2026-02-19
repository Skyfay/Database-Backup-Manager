import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { jobService } from "@/services/job-service";
import { getAuthContext, checkPermissionWithContext } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const ctx = await getAuthContext(await headers());
    if (!ctx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    checkPermissionWithContext(ctx, PERMISSIONS.JOBS.WRITE);

    const params = await props.params;
    try {
        await jobService.deleteJob(params.id);
        return NextResponse.json({ success: true });
    } catch (_error) {
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const ctx = await getAuthContext(await headers());
    if (!ctx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    checkPermissionWithContext(ctx, PERMISSIONS.JOBS.WRITE);

    const params = await props.params;
    try {
        const body = await req.json();
        const { name, schedule, sourceId, destinationId, notificationIds, enabled, encryptionProfileId, compression, retention, notificationEvents } = body;

        const updatedJob = await jobService.updateJob(params.id, {
            name,
            schedule,
            enabled,
            sourceId,
            destinationId,
            notificationIds,
            encryptionProfileId,
            compression,
            retention: retention ? JSON.stringify(retention) : undefined,
            notificationEvents
        });

        return NextResponse.json(updatedJob);
    } catch (_error) {
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}
