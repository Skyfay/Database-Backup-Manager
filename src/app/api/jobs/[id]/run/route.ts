import { NextRequest, NextResponse } from "next/server";
import { backupService } from "@/services/backup-service";
import { headers } from "next/headers";
import { getAuthContext, checkPermissionWithContext, AuthContext } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { auditService } from "@/services/audit-service";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";
import { ApiKeyError } from "@/lib/errors";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    let ctx: AuthContext | null;
    try {
        ctx = await getAuthContext(await headers());
    } catch (error) {
        if (error instanceof ApiKeyError) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 401 }
            );
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ctx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const id = params.id;

    try {
        checkPermissionWithContext(ctx, PERMISSIONS.JOBS.EXECUTE);

        const result = await backupService.executeJob(id);

        // Audit log
        if (result.success) {
            await auditService.log(
                ctx.userId,
                AUDIT_ACTIONS.EXECUTE,
                AUDIT_RESOURCES.JOB,
                {
                    executionId: result.executionId,
                    trigger: ctx.authMethod === "apikey" ? "api" : "manual",
                    ...(ctx.apiKeyId ? { apiKeyId: ctx.apiKeyId } : {}),
                },
                id
            );
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const status = error instanceof Error && error.message.includes("Permission") ? 403 : 500;
        return NextResponse.json(
            { success: false, error: message },
            { status }
        );
    }
}
