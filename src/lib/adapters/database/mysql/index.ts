import { DatabaseAdapter } from "@/lib/core/interfaces";
import { MySQLSchema } from "@/lib/adapters/definitions";
import { dump } from "./dump";
import { restore, prepareRestore } from "./restore";
import { test, getDatabases } from "./connection";
import { analyzeDump } from "./analyze";

export const MySQLAdapter: DatabaseAdapter = {
    id: "mysql",
    type: "database",
    name: "MySQL / MariaDB",
    configSchema: MySQLSchema,
    dump,
    restore,
    prepareRestore,
    test,
    getDatabases,
    analyzeDump
};
