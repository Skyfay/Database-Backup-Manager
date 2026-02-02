import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkPermission } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Generate a download URL for a file
 *
 * This creates a URL that can be used to download the file directly.
 * For local storage, it returns the API download endpoint URL.
 * For S3/cloud storage, it could return a pre-signed URL (future enhancement).
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;

    try {
        await checkPermission(PERMISSIONS.STORAGE.DOWNLOAD);

        const body = await req.json();
        const { file } = body;

        if (!file) {
            return NextResponse.json({ error: "Missing file param" }, { status: 400 });
        }

        // For now, we generate a URL to our download endpoint
        // In the future, for S3 storage, this could return a pre-signed URL
        const baseUrl = req.headers.get("origin") || "";
        const downloadUrl = `${baseUrl}/api/storage/${params.id}/download?file=${encodeURIComponent(file)}&decrypt=true`;

        return NextResponse.json({
            success: true,
            url: downloadUrl,
            // Flag to indicate this is an internal URL (vs pre-signed cloud URL)
            internal: true
        });

    } catch (error: unknown) {
        console.error("Generate download URL error:", error);

        if (error instanceof Error && error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }
}
