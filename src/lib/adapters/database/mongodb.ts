import { DatabaseAdapter, BackupResult } from "@/lib/core/interfaces";
import { z } from "zod";
import { exec } from "child_process";
import fs from "fs/promises";
import util from "util";

const execAsync = util.promisify(exec);

export const MongoDBAdapter: DatabaseAdapter = {
    id: "mongodb",
    type: "database",
    name: "MongoDB",
    configSchema: z.object({
        uri: z.string().optional().describe("Connection URI (overrides other settings)"),
        host: z.string().default("localhost"),
        port: z.number().default(27017),
        user: z.string().optional(),
        password: z.string().optional(),
        database: z.string().optional().describe("Database name (optional, dumps all if empty)"),
        options: z.string().optional().describe("Additional mongodump options"),
    }),

    async dump(config: any, destinationPath: string): Promise<BackupResult> {
        const startedAt = new Date();
        const logs: string[] = [];
        
        try {
            // mongodump creates a directory by default, or an archive with --archive
            // We want a single file, so we use --archive
            
            let command = `mongodump`;

            if (config.uri) {
                // simple URI sanitization for logs
                const sanitizedUri = config.uri.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:*****@');
                logs.push(`Using URI: ${sanitizedUri}`);
                command += ` --uri="${config.uri}"`;
            } else {
                command += ` --host "${config.host}" --port ${config.port}`;
                if (config.user && config.password) {
                     command += ` --username "${config.user}" --password "${config.password}"`;
                }
                if (config.database) {
                    command += ` --db "${config.database}"`;
                }
            }

            if (config.options) {
                command += ` ${config.options}`;
            }

            command += ` --archive="${destinationPath}" --gzip`;

            logs.push(`Executing command: ${command.replace(/--password "[^"]*"/, '--password "*****"')}`);

            const { stdout, stderr } = await execAsync(command);
            
            // mongodump writes to stderr
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
            let command = `mongorestore`;

            if (config.uri) {
                 command += ` --uri="${config.uri}"`;
            } else {
                command += ` --host "${config.host}" --port ${config.port}`;
                if (config.user && config.password) {
                     command += ` --username "${config.user}" --password "${config.password}"`;
                }
                // For restore, if database is specified, we might want to restore INTO that db using --nsInclude? 
                // Classic mongorestore behavior depends on the archive content.
                // If using --archive --gzip, it usually restores what's in there.
            }

            command += ` --archive="${sourcePath}" --gzip`;
            
            logs.push(`Executing restore command: ${command.replace(/--password "[^"]*"/, '--password "*****"')}`);

            const { stdout, stderr } = await execAsync(command);
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
    }
}
