import { DatabaseAdapter, BackupResult } from "@/lib/core/interfaces";
import { PostgresSchema } from "@/lib/adapters/definitions";
import { execFile } from "child_process";
import fs from "fs/promises";
import util from "util";

const execFileAsync = util.promisify(execFile);

export const PostgresAdapter: DatabaseAdapter = {
    id: "postgres",
    type: "database",
    name: "PostgreSQL",
    configSchema: PostgresSchema,

    async dump(config: any, destinationPath: string): Promise<BackupResult> {
        const startedAt = new Date();
        const logs: string[] = [];

        try {
            // Postgres uses PGPASSWORD env var typically or .pgpass file, but we can set env for the command
            const env = { ...process.env };
            if (config.password) {
                env.PGPASSWORD = config.password;
            }

            const args: string[] = [
                '-h', config.host,
                '-p', String(config.port),
                '-U', config.user
            ];

            if (config.options) {
                 // Basic tokenization respecting quotes
                 const parts = config.options.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
                 for (const part of parts) {
                     if (part.startsWith('"') && part.endsWith('"')) {
                        args.push(part.slice(1, -1));
                     } else if (part.startsWith("'") && part.endsWith("'")) {
                        args.push(part.slice(1, -1));
                     } else {
                        args.push(part);
                     }
                 }
            }

            // Custom format is often better for restores, but plain text is more generic.
            // Let's stick to default or let user specify in options, but we redirect output.
            args.push('-f', destinationPath);
            args.push(config.database);

            logs.push(`Executing command: pg_dump ${args.join(' ')}`);

            const { stdout, stderr } = await execFileAsync('pg_dump', args, { env });

            // pg_dump might output info to stderr even on success
            if (stderr) {
                logs.push(`stderr: ${stderr}`);
            }

            const stats = await fs.stat(destinationPath);

            return {
                success: true,
                path: destinationPath,
                size: stats.size,
                logs,
                startedAt,
                completedAt: new Date(),
            };

        } catch (error: any) {
            logs.push(`Error: ${error.message}`);
            return {
                success: false,
                logs,
                error: error.message,
                startedAt,
                completedAt: new Date(),
            };
        }
    },

    async restore(config: any, sourcePath: string): Promise<BackupResult> {
        const startedAt = new Date();
        const logs: string[] = [];

        try {
            const env = { ...process.env };
            if (config.password) {
                env.PGPASSWORD = config.password;
            }

            const args: string[] = [
                '-h', config.host,
                '-p', String(config.port),
                '-U', config.user,
                '-d', config.database,
                '-f', sourcePath
            ];

            logs.push(`Executing restore command: psql ${args.join(' ')}`);

            const { stdout, stderr } = await execFileAsync('psql', args, { env });
             if (stderr) {
                logs.push(`stderr: ${stderr}`);
            }

            return {
                success: true,
                logs,
                startedAt,
                completedAt: new Date(),
            };

        } catch (error: any) {
             logs.push(`Error: ${error.message}`);
            return {
                success: false,
                logs,
                error: error.message,
                startedAt,
                completedAt: new Date(),
            };
        }
    },

    async test(config: any): Promise<{ success: boolean; message: string }> {
        try {
            const env = { ...process.env, PGPASSWORD: config.password };
            const args = ['-h', config.host, '-p', String(config.port), '-U', config.user, '-d', 'postgres', '-c', 'SELECT 1'];

            await execFileAsync('psql', args, { env });
            return { success: true, message: "Connection successful" };
        } catch (error: any) {
             return { success: false, message: "Connection failed: " + (error.stderr || error.message) };
        }
    },

    async getDatabases(config: any): Promise<string[]> {
        const env = { ...process.env, PGPASSWORD: config.password };
        // -t = tuples only (no header/footer), -A = unaligned
        const args = ['-h', config.host, '-p', String(config.port), '-U', config.user, '-d', 'postgres', '-t', '-A', '-c', 'SELECT datname FROM pg_database WHERE datistemplate = false;'];

        const { stdout } = await execFileAsync('psql', args, { env });
        return stdout.split('\n').map(s => s.trim()).filter(s => s);
    }
};
