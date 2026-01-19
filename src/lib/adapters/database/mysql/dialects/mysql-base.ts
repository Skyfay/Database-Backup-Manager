import { BaseDialect } from "../../common/dialect";

export class MySQLBaseDialect extends BaseDialect {
    getDumpArgs(config: any, databases: string[]): string[] {
        const args = [
            '-h', config.host,
            '-P', String(config.port),
            '-u', config.user,
            '--protocol=tcp' // Always use TCP to avoid socket issues in containers
        ];

        this.appendAuthArgs(args, config);

        if (config.options) {
            args.push(...config.options.split(' ').filter((s: string) => s.trim().length > 0));
        }

        // Databases
        if (databases.length === 1 && databases[0] !== '--all-databases') {
             args.push('--databases', databases[0]);
        } else if (databases.length > 0 && databases[0] !== '--all-databases') {
             args.push('--databases', ...databases);
        } else {
             args.push('--all-databases');
        }

        return args;
    }

    getRestoreArgs(config: any, targetDatabase?: string): string[] {
        const args = [
            '-h', config.host,
            '-P', String(config.port),
            '-u', config.user,
            '--protocol=tcp'
        ];

        this.appendAuthArgs(args, config);

        // Target DB is usually passed in the stream, but some tools need it in CLI
        // For mysql client, if we want to force restoration into a specific DB, we append it.
        // BUT: if the dump contains `USE dbname;`, this might be overridden.
        if (targetDatabase) {
           args.push(targetDatabase);
        }

        return args;
    }

    getConnectionArgs(config: any): string[] {
        const args = [
            '-h', config.host,
            '-P', String(config.port),
            '-u', config.user,
            '--protocol=tcp'
        ];
        this.appendAuthArgs(args, config);
        return args;
    }

    protected appendAuthArgs(args: string[], config: any) {
        // Password is usually passed via env var, but some contexts might use -p
        // We generally rely on MYSQL_PWD env var for security, so we don't append -p here.

        // SSL Handling - Default behavior for generic MySQL
        if (config.disableSsl) {
            // Check if we are running in an environment that supports --ssl-mode (MySQL 5.7.11+)
            // Since we can't easily know the CLIENT version here without checking,
            // we assume a modern client is used in the container (MySQL 8 client).
            args.push('--ssl-mode=DISABLED');
        }
    }
}
