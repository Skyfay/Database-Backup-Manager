import { headers } from "next/headers";
import { getAuthContext } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const headersList = await headers();
    const ctx = await getAuthContext(headersList);

    if (!ctx) {
        return NextResponse.json({ autoRedirectOnJobStart: true }, { status: 200 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { autoRedirectOnJobStart: true },
        });

        return NextResponse.json({
            autoRedirectOnJobStart: user?.autoRedirectOnJobStart ?? true,
        });
    } catch {
        return NextResponse.json({ autoRedirectOnJobStart: true }, { status: 200 });
    }
}
