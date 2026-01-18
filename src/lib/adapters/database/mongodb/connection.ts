import { execFile } from "child_process";
import util from "util";

export const execFileAsync = util.promisify(execFile);

export async function test(config: any): Promise<{ success: boolean; message: string }> {
    try {
        const args = ['--eval', 'db.runCommand({ ping: 1 })', '--quiet'];

        if (config.uri) {
            args.push(config.uri);
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
        }

        await execFileAsync('mongosh', args);
        return { success: true, message: "Connection successful" };
    } catch (error: any) {
            return { success: false, message: "Connection failed: " + (error.stderr || error.message) };
    }
}

export async function getDatabases(config: any): Promise<string[]> {
    const args = ['--eval', "db.adminCommand('listDatabases').databases.map(d => d.name).join(',')", '--quiet'];

    if (config.uri) {
        args.push(config.uri);
    } else {
        args.push('--host', config.host);
        args.push('--port', config.port.toString());
        if (config.user && config.password) {
            args.push('--username', config.user);
            args.push('--password', config.password);
            if (config.authenticationDatabase) {
                args.push('--authenticationDatabase', config.authenticationDatabase);
            } else {
                args.push('--authenticationDatabase', 'admin');
            }
        }
    }

    const { stdout } = await execFileAsync('mongosh', args);
    const sysDbs = ['admin', 'config', 'local'];
    return stdout.trim().split(',').map(s => s.trim()).filter(s => s && !sysDbs.includes(s));
}
