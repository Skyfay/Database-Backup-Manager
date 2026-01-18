import { BackupResult } from "@/lib/core/interfaces";
import { execFileAsync } from "./connection";
import fs from "fs/promises";

export async function dump(config: any, destinationPath: string, onLog?: (msg: string) => void, onProgress?: (percentage: number) => void): Promise<BackupResult> {
    const startedAt = new Date();
    const logs: string[] = [];

    try {
        // mongodump creates a directory by default, or an archive with --archive
        // We want a single file, so we use --archive

        const args: string[] = [];

        if (config.uri) {
            // simple URI sanitization for logs
            const sanitizedUri = config.uri.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:*****@');
            logs.push(`Using URI: ${sanitizedUri}`);
            args.push(`--uri=${config.uri}`);
        } else {
            args.push('--host', config.host);
            args.push('--port', String(config.port));

            if (config.user && config.password) {
                    args.push('--username', config.user);
                    args.push('--password', config.password);
                    if (config.authenticationDatabase) {
                        args.push('--authenticationDatabase', config.authenticationDatabase);
                    } else {
                        args.push('--authenticationDatabase', 'admin');
                    }
            }
            if (config.database) {
                args.push('--db', config.database);
            }
        }

        if (config.options) {
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

        args.push(`--archive=${destinationPath}`);
        args.push('--gzip');

        // Log command (mask password)
        const logArgs = args.map(arg => {
            if (arg === config.password) return '*****';
            if (arg.startsWith('--uri=')) return arg.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:*****@');
            return arg;
        });
        logs.push(`Executing command: mongodump ${logArgs.join(' ')}`);

        const { stdout, stderr } = await execFileAsync('mongodump', args);

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
}
