import { execFileAsync } from "./connection";

export async function analyzeDump(sourcePath: string): Promise<string[]> {
    const dbs = new Set<string>();

    try {
        // Use grep for fast scan
        // Search for: USE `...`; | CREATE DATABASE ... | -- Current Database: ...
        const { stdout } = await execFileAsync('grep', ['-E', '^USE |CREATE DATABASE |-- Current Database:', sourcePath], { maxBuffer: 10 * 1024 * 1024 });

        const lines = stdout.split('\n');
        for (const line of lines) {
            // 1. Look for USE statements (most reliable for multi-db context)
            // Matches: USE `dbname`;
            const useMatch = line.match(/^USE `([^`]+)`;/i);
            if (useMatch) {
                dbs.add(useMatch[1]);
            }

            // 2. Look for CREATE DATABASE
            // Matches: CREATE DATABASE `foo` ...
            // Matches: CREATE DATABASE IF NOT EXISTS `foo` ...
            // Matches: CREATE DATABASE /*!32312 IF NOT EXISTS*/ `foo` ...
            // We use a broader regex: CREATE DATABASE [anything/comments] `name`
            const createMatch = line.match(/CREATE DATABASE .*?`([^`]+)`/i);
            if (createMatch) {
                dbs.add(createMatch[1]);
            }

            // 3. Look for standard mysqldump comments
            // Matches: -- Current Database: `foo`
            const currentMatch = line.match(/-- Current Database: `([^`]+)`/i);
            if (currentMatch) {
                dbs.add(currentMatch[1]);
            }
        }
    } catch (e: any) {
        // grep exit code 1 means no matches
        if (e.code !== 1) {
            console.error("Error analyzing MySQL dump:", e);
        }
    }

    return Array.from(dbs);
}
