import { AnyDatabaseConfig } from "@/lib/adapters/definitions";

export interface DatabaseDialect {
    /**
     * Generate arguments for the dump command
     */
    getDumpArgs(config: AnyDatabaseConfig, databases: string[]): string[];

    /**
     * Generate arguments for the restore command
     * @param targetDatabase - The specific target database name for this restore operation (if applicable)
     */
    getRestoreArgs(config: AnyDatabaseConfig, targetDatabase?: string): string[];

    /**
     * CLI specific flags for authentication/connection (e.g. --skip-ssl vs --ssl-mode=DISABLED)
     */
    getConnectionArgs(config: AnyDatabaseConfig): string[];

    /**
     * Determines if this dialect handles the given version string
     */
    supportsVersion(version: string): boolean;
}

export abstract class BaseDialect implements DatabaseDialect {
    abstract getDumpArgs(config: AnyDatabaseConfig, databases: string[]): string[];
    abstract getRestoreArgs(config: AnyDatabaseConfig, targetDatabase?: string): string[];
    abstract getConnectionArgs(config: AnyDatabaseConfig): string[];

    supportsVersion(_version: string): boolean {
        return true; // Default fallback
    }

    protected appendAuthArgs(_args: string[], _config: AnyDatabaseConfig) {
        // Implementation provided by subclasses or specific common logic
    }
}
