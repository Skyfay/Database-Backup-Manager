'use server';

import { auditService } from "@/services/audit-service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";

export async function logLoginSuccess() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (session?.user) {
            await auditService.log(
                session.user.id,
                AUDIT_ACTIONS.LOGIN,
                AUDIT_RESOURCES.AUTH,
                {
                   method: "web-ui",
                   userAgent: (await headers()).get("user-agent") || "unknown"
                }
            );
        }
    } catch (e) {
        console.error("Failed to log login success", e);
    }
}
