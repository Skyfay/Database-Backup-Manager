import { execFile } from "child_process";
import util from "util";
import { PostgresConfig } from "@/lib/adapters/definitions";

export const execFileAsync = util.promisify(execFile);

export async function test(config: PostgresConfig): Promise<{ success: boolean; message: string; version?: string }> {
    const dbsToTry = ['postgres', 'template1'];
    if (typeof config.database === 'string' && config.database) dbsToTry.push(config.database);

    const env = { ...process.env, PGPASSWORD: config.password };
    let lastError: unknown;

    for (const db of dbsToTry) {
        try {
            const args = ['-h', config.host, '-p', String(config.port), '-U', config.user, '-d', db, '-t', '-c', 'SELECT version()'];
            const { stdout } = await execFileAsync('psql', args, { env });

            // Extract version number only (e.g. "PostgreSQL 16.1 on ..." → "16.1")
            const rawVersion = stdout.trim();
            const versionMatch = rawVersion.match(/PostgreSQL\s+([\d.]+)/);
            const version = versionMatch ? versionMatch[1] : rawVersion;

            return { success: true, message: "Connection successful", version };
        } catch (error: unknown) {
            lastError = error;
        }
    }
    const errMsg = lastError instanceof Error
        ? (lastError as { stderr?: string }).stderr || lastError.message
        : String(lastError);
    return { success: false, message: "Connection failed: " + errMsg };
}

export async function getDatabases(config: PostgresConfig): Promise<string[]> {
    const dbsToTry = ['postgres', 'template1'];
    if (typeof config.database === 'string' && config.database) dbsToTry.push(config.database);

    const env = { ...process.env, PGPASSWORD: config.password };
    let lastError: unknown;

    for (const db of dbsToTry) {
        try {
            // -t = tuples only (no header/footer), -A = unaligned
            const args = ['-h', config.host, '-p', String(config.port), '-U', config.user, '-d', db, '-t', '-A', '-c', 'SELECT datname FROM pg_database WHERE datistemplate = false;'];
            const { stdout } = await execFileAsync('psql', args, { env });
            return stdout.split('\n').map(s => s.trim()).filter(s => s);
        } catch (error: unknown) {
            lastError = error;
        }
    }
    throw lastError;
}

import { DatabaseInfo } from "@/lib/core/interfaces";

export async function getDatabasesWithStats(config: PostgresConfig): Promise<DatabaseInfo[]> {
    const dbsToTry = ['postgres', 'template1'];
    if (typeof config.database === 'string' && config.database) dbsToTry.push(config.database);

    const env = { ...process.env, PGPASSWORD: config.password };
    let lastError: unknown;

    // Query database sizes and approximate table counts
    const query = `
        SELECT
            d.datname,
            pg_database_size(d.datname) AS size_bytes,
            (SELECT count(*) FROM information_schema.tables WHERE table_catalog = d.datname AND table_schema NOT IN ('pg_catalog', 'information_schema')) AS table_count
        FROM pg_database d
        WHERE d.datistemplate = false
        ORDER BY d.datname;
    `.trim().replace(/\n/g, ' ');

    for (const db of dbsToTry) {
        try {
            const args = ['-h', config.host, '-p', String(config.port), '-U', config.user, '-d', db, '-t', '-A', '-F', '\t', '-c', query];
            const { stdout } = await execFileAsync('psql', args, { env });

            return stdout
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const parts = line.split('\t');
                    return {
                        name: parts[0],
                        sizeInBytes: parseInt(parts[1], 10) || 0,
                        tableCount: parseInt(parts[2], 10) || 0,
                    };
                });
        } catch (error: unknown) {
            lastError = error;
        }
    }
    throw lastError;
}
