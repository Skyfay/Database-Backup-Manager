import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/core/registry";
import { registerAdapters } from "@/lib/adapters";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Ensure adapters are registered
registerAdapters();

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { adapterId, config } = body;

        if (!adapterId || !config) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const adapter = registry.get(adapterId);

        if (!adapter) {
            return NextResponse.json({ success: false, message: "Adapter not found" }, { status: 404 });
        }

        if (!adapter.getDatabases) {
            return NextResponse.json({ success: false, message: "This adapter does not support listing databases." });
        }

        const databases = await adapter.getDatabases(config);

        return NextResponse.json({ success: true, databases });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
