// import { DatabaseDialect } from "../../common/dialect";
import { PostgresBaseDialect } from "./postgres-base";
import { PostgresConfig } from "@/lib/adapters/definitions";

/**
 * PostgreSQL 14.x Dialect
 *
 * Key differences from PG 17:
 * - No transaction_timeout parameter
 * - Different SET commands in dumps
 */
export class Postgres14Dialect extends PostgresBaseDialect {
    override getDumpArgs(config: PostgresConfig, databases: string[]): string[] {
        const args = super.getDumpArgs(config, databases);

        // Add --no-sync for compatibility across versions
        args.push('--no-sync');

        return args;
    }
}
