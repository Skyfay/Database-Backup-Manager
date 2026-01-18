import { execFileAsync } from "./connection";

export async function analyzeDump(sourcePath: string): Promise<string[]> {
    const dbs = new Set<string>();
    try {
        // Use grep for fast scanning of large files (avoid reading GBs into Node)
        // Search for: CREATE DATABASE ... or \connect ...
        const { stdout } = await execFileAsync('grep', ['-E', '^CREATE DATABASE |^\\\\connect ', sourcePath], {
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for matched lines
        });

        const lines = stdout.split('\n');
        for (const line of lines) {
            // Matches: CREATE DATABASE "dbname" or CREATE DATABASE dbname
            const createMatch = line.match(/^CREATE DATABASE "?([^";\s]+)"? /i);
            if (createMatch) dbs.add(createMatch[1]);

            // Matches: \connect "dbname"
            const connectMatch = line.match(/^\\connect "?([^"\s]+)"?/i);
            if (connectMatch) dbs.add(connectMatch[1]);
        }
    } catch (e: any) {
        // grep returns exit code 1 if no matches found, which is fine
        if (e.code !== 1) {
                console.error("Error analyzing Postgres dump:", e);
        }
        // If grep fails (e.g. not found), we return empty or try fallback?
        // In our Docker env, grep should exist.
    }
    return Array.from(dbs);
}
