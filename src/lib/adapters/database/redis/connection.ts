import { execFile } from "child_process";
import util from "util";

const execFileAsync = util.promisify(execFile);

/**
 * Build redis-cli connection arguments from config
 */
function buildConnectionArgs(config: any): string[] {
    const args: string[] = [];

    args.push("-h", config.host);
    args.push("-p", String(config.port));

    // Authentication
    if (config.username) {
        args.push("--user", config.username);
    }
    if (config.password) {
        args.push("-a", config.password);
    }

    // TLS
    if (config.tls) {
        args.push("--tls");
    }

    // Database selection
    if (config.database !== undefined && config.database !== 0) {
        args.push("-n", String(config.database));
    }

    return args;
}

/**
 * Test connection to Redis server
 */
export async function test(config: any): Promise<{ success: boolean; message: string; version?: string }> {
    try {
        const args = buildConnectionArgs(config);

        // Test with PING command
        const pingArgs = [...args, "PING"];
        const { stdout: pingResult } = await execFileAsync("redis-cli", pingArgs);

        if (!pingResult.trim().includes("PONG")) {
            return { success: false, message: "Redis did not respond with PONG" };
        }

        // Get version info
        const infoArgs = [...args, "INFO", "server"];
        const { stdout: infoResult } = await execFileAsync("redis-cli", infoArgs);

        // Parse redis_version from INFO output
        const versionMatch = infoResult.match(/redis_version:([^\r\n]+)/);
        const version = versionMatch ? versionMatch[1].trim() : undefined;

        return {
            success: true,
            message: "Connection successful",
            version
        };
    } catch (error: any) {
        const errorMsg = error.stderr || error.message || "Unknown error";
        return {
            success: false,
            message: `Connection failed: ${errorMsg}`
        };
    }
}

/**
 * Get list of databases with data
 *
 * Redis uses numbered databases (0-15 by default).
 * This function returns databases that contain at least one key.
 */
export async function getDatabases(config: any): Promise<string[]> {
    try {
        const baseArgs = buildConnectionArgs({ ...config, database: 0 });

        // Get the number of configured databases
        const configArgs = [...baseArgs, "CONFIG", "GET", "databases"];
        const { stdout: configResult } = await execFileAsync("redis-cli", configArgs);

        // Parse: "databases\n16\n" -> 16
        const lines = configResult.trim().split("\n");
        const maxDbs = parseInt(lines[1] || "16", 10);

        const nonEmptyDbs: string[] = [];

        // Check each database for keys
        for (let i = 0; i < maxDbs; i++) {
            const dbArgs = [...baseArgs, "-n", String(i), "DBSIZE"];
            const { stdout } = await execFileAsync("redis-cli", dbArgs);

            // Parse: "(integer) 42" -> 42
            const sizeMatch = stdout.match(/\(integer\)\s*(\d+)/);
            const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

            if (size > 0) {
                nonEmptyDbs.push(String(i));
            }
        }

        return nonEmptyDbs;
    } catch (error: any) {
        console.error("Failed to get databases:", error.message);
        // Return default database on error
        return ["0"];
    }
}

export { buildConnectionArgs };
