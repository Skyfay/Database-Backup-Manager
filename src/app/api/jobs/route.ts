import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { scheduler } from "@/lib/scheduler";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkPermission } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await checkPermission(PERMISSIONS.JOBS.READ);

        const jobs = await prisma.job.findMany({
            include: {
                source: true,
                destination: true,
                notifications: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(jobs);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await checkPermission(PERMISSIONS.JOBS.WRITE);

        const body = await req.json();
        const { name, schedule, sourceId, destinationId, notificationIds, enabled } = body;


        if (!name || !schedule || !sourceId || !destinationId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newJob = await prisma.job.create({
            data: {
                name,
                schedule,
                sourceId,
                destinationId,
                enabled: enabled !== undefined ? enabled : true,
                notifications: {
                    connect: notificationIds?.map((id: string) => ({ id })) || []
                }
            },
            include: {
                source: true,
                destination: true,
                notifications: true,
            }
        });

        // Refresh scheduler to pick up the new job
        await scheduler.refresh();

        return NextResponse.json(newJob, { status: 201 });
    } catch (error) {
        console.error("Create job error:", error);
        return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }
}
