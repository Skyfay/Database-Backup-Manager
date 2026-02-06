import { BaseDialect } from "../../common/dialect";
import { MySQLConfig } from "@/lib/adapters/definitions";

export class MySQLBaseDialect extends BaseDialect {
    getDumpArgs(config: MySQLConfig, databases: string[]): string[] {
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

        // Single database dump (Multi-DB is handled via TAR in dump.ts)
        if (databases.length === 1) {
            args.push('--databases', databases[0]);
        }

        return args;
    }

    getRestoreArgs(config: MySQLConfig, targetDatabase?: string): string[] {
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

    getConnectionArgs(config: MySQLConfig): string[] {
        const args = [
            '-h', config.host,
            '-P', String(config.port),
            '-u', config.user,
            '--protocol=tcp'
        ];
        this.appendAuthArgs(args, config);
        return args;
    }

    protected appendAuthArgs(args: string[], config: MySQLConfig) {
        // Password is usually passed via env var, but some contexts might use -p
        // We generally rely on MYSQL_PWD env var for security, so we don't append -p here.

        // SSL Handling - Default behavior for generic MySQL
        if (config.disableSsl) {
            // Check if we are running in an environment that supports --ssl-mode (MySQL 5.7.11+)
            // Since we use Alpine Linux, the installed 'mysql-client' is actually MariaDB Client.
            // MariaDB Client does not support --ssl-mode=DISABLED, it uses --skip-ssl.
            args.push('--skip-ssl');
        }
    }
}
