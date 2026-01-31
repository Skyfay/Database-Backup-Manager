import { MSSQLDialect } from "./mssql-base";

/**
 * MSSQL Dialect for SQL Server 2017 (v14.x)
 *
 * SQL Server 2017 uses the same T-SQL syntax as 2019+ for BACKUP/RESTORE.
 * This dialect exists for future version-specific differences.
 */
export class MSSQL2017Dialect extends MSSQLDialect {
    /**
     * Check version support - SQL Server 2017 is version 14.x
     */
    supportsVersion(version: string): boolean {
        const majorVersion = parseInt(version.split(".")[0], 10);
        return majorVersion === 14;
    }
}
