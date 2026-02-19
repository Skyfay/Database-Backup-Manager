import { DatabaseAdapter } from "@/lib/core/interfaces";
import { PostgresSchema } from "@/lib/adapters/definitions";
import { dump } from "./dump";
import { restore, prepareRestore } from "./restore";
import { test, getDatabases, getDatabasesWithStats } from "./connection";
import { analyzeDump } from "./analyze";

export const PostgresAdapter: DatabaseAdapter = {
    id: "postgres",
    type: "database",
    name: "PostgreSQL",
    configSchema: PostgresSchema,
    dump,
    restore,
    prepareRestore,
    test,
    getDatabases,
    getDatabasesWithStats,
    analyzeDump
};
