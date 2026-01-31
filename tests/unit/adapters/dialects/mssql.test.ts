import { describe, it, expect } from "vitest";
import { MSSQLDialect } from "@/lib/adapters/database/mssql/dialects/mssql-base";
import { MSSQL2017Dialect } from "@/lib/adapters/database/mssql/dialects/mssql-2017";
import { getDialect } from "@/lib/adapters/database/mssql/dialects";

describe("MSSQL Dialects", () => {
    describe("Dialect Factory", () => {
        it("should return base dialect for SQL Server 2019+", () => {
            const dialect = getDialect("15.0.4000"); // SQL Server 2019
            expect(dialect).toBeInstanceOf(MSSQLDialect);
        });

        it("should return base dialect for SQL Server 2022", () => {
            const dialect = getDialect("16.0.1000"); // SQL Server 2022
            expect(dialect).toBeInstanceOf(MSSQLDialect);
        });

        it("should return 2017 dialect for SQL Server 2017", () => {
            const dialect = getDialect("14.0.3000"); // SQL Server 2017
            expect(dialect).toBeInstanceOf(MSSQL2017Dialect);
        });

        it("should return base dialect when no version provided", () => {
            const dialect = getDialect();
            expect(dialect).toBeInstanceOf(MSSQLDialect);
        });
    });

    describe("MSSQLDialect (2019+)", () => {
        const dialect = new MSSQLDialect();

        describe("getBackupQuery", () => {
            it("should generate basic backup query", () => {
                const query = dialect.getBackupQuery("testdb", "/backup/testdb.bak");

                expect(query).toContain("BACKUP DATABASE [testdb]");
                expect(query).toContain("TO DISK = N'/backup/testdb.bak'");
                expect(query).toContain("FORMAT");
                expect(query).toContain("INIT");
            });

            it("should include compression by default", () => {
                const query = dialect.getBackupQuery("testdb", "/backup/testdb.bak");
                expect(query).toContain("COMPRESSION");
            });

            it("should exclude compression when explicitly disabled", () => {
                const query = dialect.getBackupQuery("testdb", "/backup/testdb.bak", {
                    compression: false,
                });
                expect(query).not.toContain("COMPRESSION");
            });

            it("should include compression when explicitly enabled", () => {
                const query = dialect.getBackupQuery("testdb", "/backup/testdb.bak", {
                    compression: true,
                });
                expect(query).toContain("COMPRESSION");
            });

            it("should include stats option", () => {
                const query = dialect.getBackupQuery("testdb", "/backup/testdb.bak", {
                    stats: 10,
                });
                expect(query).toContain("STATS = 10");
            });

            it("should include copy_only option", () => {
                const query = dialect.getBackupQuery("testdb", "/backup/testdb.bak", {
                    copyOnly: true,
                });
                expect(query).toContain("COPY_ONLY");
            });

            it("should escape database names with brackets", () => {
                const query = dialect.getBackupQuery("my-database", "/backup/test.bak");
                expect(query).toContain("[my-database]");
            });
        });

        describe("getRestoreQuery", () => {
            it("should generate basic restore query", () => {
                const query = dialect.getRestoreQuery("testdb", "/backup/testdb.bak");

                expect(query).toContain("RESTORE DATABASE [testdb]");
                expect(query).toContain("FROM DISK = N'/backup/testdb.bak'");
            });

            it("should include REPLACE option when enabled", () => {
                const query = dialect.getRestoreQuery("testdb", "/backup/testdb.bak", {
                    replace: true,
                });
                expect(query).toContain("REPLACE");
            });

            it("should include RECOVERY option by default", () => {
                const query = dialect.getRestoreQuery("testdb", "/backup/testdb.bak");
                expect(query).toContain("RECOVERY");
            });

            it("should include NORECOVERY when recovery is false", () => {
                const query = dialect.getRestoreQuery("testdb", "/backup/testdb.bak", {
                    recovery: false,
                });
                expect(query).toContain("NORECOVERY");
                expect(query).not.toContain("WITH RECOVERY");
            });

            it("should include MOVE clauses for file relocation", () => {
                const query = dialect.getRestoreQuery("newdb", "/backup/olddb.bak", {
                    moveFiles: [
                        { logicalName: "olddb", physicalPath: "/data/newdb.mdf" },
                        { logicalName: "olddb_log", physicalPath: "/data/newdb.ldf" },
                    ],
                });

                expect(query).toContain("MOVE N'olddb' TO N'/data/newdb.mdf'");
                expect(query).toContain("MOVE N'olddb_log' TO N'/data/newdb.ldf'");
            });

            it("should include stats option", () => {
                const query = dialect.getRestoreQuery("testdb", "/backup/testdb.bak", {
                    stats: 5,
                });
                expect(query).toContain("STATS = 5");
            });
        });

        describe("supportsVersion", () => {
            it("should return true for SQL Server 2019+", () => {
                expect(dialect.supportsVersion("15.0.4000")).toBe(true);
                expect(dialect.supportsVersion("16.0.1000")).toBe(true);
            });

            it("should return false for SQL Server 2017", () => {
                expect(dialect.supportsVersion("14.0.3000")).toBe(false);
            });
        });
    });

    describe("MSSQL2017Dialect", () => {
        const dialect = new MSSQL2017Dialect();

        describe("supportsVersion", () => {
            it("should return true for SQL Server 2017", () => {
                expect(dialect.supportsVersion("14.0.3000")).toBe(true);
                expect(dialect.supportsVersion("14.0.1000")).toBe(true);
            });

            it("should return false for SQL Server 2019+", () => {
                expect(dialect.supportsVersion("15.0.4000")).toBe(false);
                expect(dialect.supportsVersion("16.0.1000")).toBe(false);
            });
        });

        it("should generate same backup query as base dialect", () => {
            const baseDialect = new MSSQLDialect();
            const db = "testdb";
            const path = "/backup/test.bak";

            // 2017 dialect currently inherits from base
            expect(dialect.getBackupQuery(db, path)).toBe(baseDialect.getBackupQuery(db, path));
        });
    });
});
