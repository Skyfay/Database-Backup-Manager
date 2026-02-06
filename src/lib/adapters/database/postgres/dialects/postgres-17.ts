// import { DatabaseDialect } from "../../common/dialect";
import { PostgresBaseDialect } from "./postgres-base";
import { PostgresConfig } from "@/lib/adapters/definitions";

/**
 * PostgreSQL 17.x Dialect
 *
 * New features in PG 17:
 * - transaction_timeout parameter
 * - Enhanced JSON functions
 * - New backup options
 */
export class Postgres17Dialect extends PostgresBaseDialect {
    override getDumpArgs(config: PostgresConfig, databases: string[]): string[] {
        const args = super.getDumpArgs(config, databases);

        // PG 17 specific optimizations
        args.push('--no-sync');
        args.push('--encoding=UTF8'); // Explicit UTF8 for PG 17

        return args;
    }
}
