import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handlers = toNextJsHandler(auth);

// Debug wrapper to catch and log SSO errors
async function debugHandler(req: NextRequest, method: "GET" | "POST") {
    const url = new URL(req.url);
    const isCallback = url.pathname.includes("/sso/callback");

    if (isCallback) {
        console.log("=== SSO CALLBACK DEBUG ===");
        console.log("URL:", req.url);
        console.log("Pathname:", url.pathname);
        console.log("Search Params:", Object.fromEntries(url.searchParams));
    }

    try {
        const handler = method === "GET" ? handlers.GET : handlers.POST;
        return await handler(req);
    } catch (error: unknown) {
        console.error("AUTH_ERROR:", error);
        if (error instanceof Error) {
            console.error("SSO CALLBACK ERROR STACK:", error.stack);
            // Log full error details
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            // Try to get more info
            console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        }
        // Log the error as-is for any non-Error objects
        console.error("# SERVER_ERROR: ", error);
        throw error;
    }
}

export async function GET(req: NextRequest) {
    return debugHandler(req, "GET");
}

export async function POST(req: NextRequest) {
    return debugHandler(req, "POST");
}
