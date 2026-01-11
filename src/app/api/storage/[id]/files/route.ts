
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

        // Enrich with Job and Source info
        const jobNames = new Set<string>();
        for (const file of files) {
             const parts = file.path.split('/');
             if (parts.length > 2 && parts[0] === 'backups') {
                 // backups/JobName/File
                 jobNames.add(parts[1]);
             } else if (parts.length > 1 && parts[0] !== 'backups') {
                 // JobName/File
                 jobNames.add(parts[0]);
             } else {
                  // Try regex match on filename for fallback: jobname_timestamp
                  // Note: creating job name logic in runner replaces special chars with _
                  // If job name was "My-Job", it became "My_Job". We can only match on the transformed name.
                  const match = file.name.match(/^(.+?)_\d{4}-\d{2}-\d{2}/);
                  if (match && match[1]) {
                      // This might be tricky if job name has underscores, but it's a best effort
                       jobNames.add(match[1]);
                  }
             }
        }

        // Fetch jobs. Note: We are matching against job 'name', but the folders might be using sanitized names.
        // The runner does: job.name.replace(/[^a-z0-9]/gi, '_')
        // So we really should fetch all jobs and assume we can map them, or store the sanitized name.
        // For now, let's fetch all jobs and build a map of sanitized -> job
        const allJobs = await prisma.job.findMany({
             include: { source: true }
        });

        const jobMap = new Map();
        allJobs.forEach(j => {
             const sanitized = j.name.replace(/[^a-z0-9]/gi, '_');
             jobMap.set(sanitized, j);
             // Also map keys to the raw name just in case
             jobMap.set(j.name, j); 
        });

        const enrichedFiles = files.map(file => {
             let potentialJobName = null;
             const parts = file.path.split('/');
              if (parts.length > 2 && parts[0] === 'backups') {
                 potentialJobName = parts[1];
             } else if (parts.length > 1 && parts[0] !== 'backups') {
                 potentialJobName = parts[0];
             } else {
                 const match = file.name.match(/^(.+?)_\d{4}-\d{2}-\d{2}/);
                 if (match) potentialJobName = match[1];
             }

             const job = potentialJobName ? jobMap.get(potentialJobName) : null;
             
             return {
                  ...file,
                  jobName: job ? job.name : (potentialJobName || "Unknown"),
                  sourceName: job && job.source ? job.source.name : "Unknown",
                  sourceType: job && job.source ? job.source.adapterId : null
             };
        });

        return NextResponse.json(enrichedFiles);

    } catch (error: any) {
        console.error("List files error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { path } = await req.json();
        const params = await props.params;

        if (!path) {
            return NextResponse.json({ error: "Path is required" }, { status: 400 });
        }

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

        const config = JSON.parse(adapterConfig.config);
        const success = await adapter.delete(config, path);

        if (!success) {
             return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete file error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
