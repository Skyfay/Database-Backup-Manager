
import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/core/registry";
import { registerAdapters } from "@/lib/adapters"; // Import registration
import { StorageAdapter } from "@/lib/core/interfaces";
import prisma from "@/lib/prisma";

// Ensure adapters are registered in this route handler environment
registerAdapters();

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const adapterConfig = await prisma.adapterConfig.findUnique({
            where: { id: params.id }
        });

        if (!adapterConfig) {
            return NextResponse.json({ error: "Adapter not found" }, { status: 404 });
        }

        if (adapterConfig.type !== "storage") {
            return NextResponse.json({ error: "Not a storage adapter" }, { status: 400 });
        }

        const adapter = registry.get(adapterConfig.adapterId) as StorageAdapter;
        if (!adapter) {
            return NextResponse.json({ error: "Adapter implementation not found" }, { status: 500 });
        }

        // Parse config
        const config = JSON.parse(adapterConfig.config);

        // List files (assuming root for now, or use query param for subdirs logic later)
        const files = await adapter.list(config, "");

        return NextResponse.json(files);

    } catch (error: any) {
        console.error("List files error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
