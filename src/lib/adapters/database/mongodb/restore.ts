import { BackupResult } from "@/lib/core/interfaces";
import { execFileAsync } from "./connection";

export async function prepareRestore(config: any, databases: string[]): Promise<void> {
    const usePrivileged = !!config.privilegedAuth;
    const user = usePrivileged ? config.privilegedAuth.user : config.user;
    const pass = usePrivileged ? config.privilegedAuth.password : config.password;

    const args = ['--quiet'];
    if (config.uri) {
        args.push(config.uri);
    } else {
        args.push('--host', config.host);
        args.push('--port', String(config.port));
    }

    if (user && pass) {
        args.push('--username', user);
        args.push('--password', pass);
        if (config.authenticationDatabase) {
                args.push('--authenticationDatabase', config.authenticationDatabase);
        } else if (!config.uri) {
                args.push('--authenticationDatabase', 'admin');
        }
    }

    for (const dbName of databases) {
            const evalScript = `
            try {
                var target = db.getSiblingDB('${dbName.replace(/'/g, "\\'")}');
                target.createCollection('__perm_check_tmp');
                target.getCollection('__perm_check_tmp').drop();
            } catch(e) {
                print('ERROR: ' + e.message);
                quit(1);
            }
            `;

            try {
            await execFileAsync('mongosh', [...args, '--eval', evalScript]);
            } catch(e: any) {
                const msg = e.stdout || e.stderr || e.message || "";
                if (msg.includes("not authorized") || msg.includes("Authorization") || msg.includes("requires authentication") || msg.includes("command create requires")) {
                    throw new Error(`Access denied to database '${dbName}'. Permissions?`);
                }
                throw e;
            }
    }
}

export async function restore(config: any, sourcePath: string): Promise<BackupResult> {
    const startedAt = new Date();
    const logs: string[] = [];

    try {
        const args: string[] = [];

        if (config.uri) {
                args.push(`--uri=${config.uri}`);
        } else {
            args.push('--host', config.host);
            args.push('--port', String(config.port));
            if (config.user && config.password) {
                    args.push('--username', config.user);
                    args.push('--password', config.password);
            }
        }

        args.push(`--archive=${sourcePath}`);
        args.push('--gzip');

        // Log command (mask password)
        const logArgs = args.map(arg => {
            if (arg === config.password) return '*****';
            if (arg.startsWith('--uri=')) return arg.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:*****@');
            return arg;
        });
        logs.push(`Executing restore command: mongorestore ${logArgs.join(' ')}`);

        const { stdout, stderr } = await execFileAsync('mongorestore', args);
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
