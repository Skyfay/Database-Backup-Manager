import { MySQLBaseDialect } from "./mysql-base";
import { MariaDBConfig } from "@/lib/adapters/definitions";

export class MariaDBDialect extends MySQLBaseDialect {
    supportsVersion(version: string): boolean {
        return version.toLowerCase().includes('mariadb') || parseFloat(version) >= 10.0;
    }

    protected appendAuthArgs(args: string[], config: MariaDBConfig) {
        // MariaDB tools prefer --skip-ssl over --ssl-mode
        if (config.disableSsl) {
             args.push('--skip-ssl');
        }
    }

    getDumpArgs(config: MariaDBConfig, databases: string[]): string[] {
        const args = super.getDumpArgs(config, databases);

        // MariaDB specific dump flags could be added here.
        // For example --sandbox or specific locking behavior.
        // For compatibility, we stick to the base flags for now.

        return args;
    }
}
