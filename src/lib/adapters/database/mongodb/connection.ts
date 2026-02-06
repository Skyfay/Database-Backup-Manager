import { MongoClient } from "mongodb";
import { MongoDBConfig } from "@/lib/adapters/definitions";

/**
 * Build MongoDB connection URI from config
 */
function buildConnectionUri(config: MongoDBConfig): string {
    if (config.uri) {
        return config.uri;
    }

    const auth = config.user && config.password
        ? `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@`
        : "";
    const authDb = config.authenticationDatabase || "admin";
    const authParam = config.user ? `?authSource=${authDb}` : "";

    return `mongodb://${auth}${config.host}:${config.port}/${authParam}`;
}

export async function test(config: MongoDBConfig): Promise<{ success: boolean; message: string; version?: string }> {
    let client: MongoClient | null = null;

    try {
        const uri = buildConnectionUri(config);
        client = new MongoClient(uri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
        });

        await client.connect();

        // Ping the database
        const adminDb = client.db("admin");
        await adminDb.command({ ping: 1 });

        // Get server version
        const serverInfo = await adminDb.command({ buildInfo: 1 });
        const version = serverInfo.version || "Unknown";

        return { success: true, message: "Connection successful", version };
    } catch (error: unknown) {
        const err = error as { message?: string };
        return { success: false, message: "Connection failed: " + (err.message || "Unknown error") };
    } finally {
        if (client) {
            await client.close().catch(() => {});
        }
    }
}

export async function getDatabases(config: MongoDBConfig): Promise<string[]> {
    let client: MongoClient | null = null;

    try {
        const uri = buildConnectionUri(config);
        client = new MongoClient(uri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
        });

        await client.connect();

        const adminDb = client.db("admin");
        const result = await adminDb.command({ listDatabases: 1 });

        const sysDbs = ["admin", "config", "local"];
        return result.databases
            .map((db: { name: string }) => db.name)
            .filter((name: string) => !sysDbs.includes(name));
    } catch (error: unknown) {
        const err = error as { message?: string };
        throw new Error("Failed to list databases: " + (err.message || "Unknown error"));
    } finally {
        if (client) {
            await client.close().catch(() => {});
        }
    }
}
