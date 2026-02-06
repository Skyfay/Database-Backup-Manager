import { DatabaseDialect } from "../../common/dialect";
import { PostgresConfig } from "@/lib/adapters/definitions";

export class PostgresBaseDialect implements DatabaseDialect {
    supportsVersion(_version: string): boolean {
        return true;
    }

    getDumpArgs(config: PostgresConfig, databases: string[]): string[] {
        // Single DB dump using pg_dump with custom format (-Fc)
        // Multi-DB backups are handled separately in dump.ts using TAR archives
        const args: string[] = [
            '-h', config.host,
            '-p', String(config.port),
            '-U', config.user,
            '-F', 'c', // Custom Format (compressed, binary)
            '-Z', '6', // Compression level
        ];

        // Single database
        if (databases.length === 1) {
            args.push('-d', databases[0]);
        } else if (typeof config.database === 'string' && config.database) {
            args.push('-d', config.database);
        }

        // Add options
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

        return args;
    }

    getRestoreArgs(_config: PostgresConfig, _targetDatabase?: string): string[] {
        // Note: PostgreSQL restore uses pg_restore with args built directly in restore.ts
        // This method exists only to satisfy the DatabaseDialect interface
        return [];
    }

    getConnectionArgs(config: PostgresConfig): string[] {
        // Postgres auth is env based usually.
        return [
            '-h', config.host,
            '-p', String(config.port),
            '-U', config.user
        ];
    }
}
