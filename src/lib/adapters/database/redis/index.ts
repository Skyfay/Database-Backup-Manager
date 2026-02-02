import { DatabaseAdapter } from "@/lib/core/interfaces";
import { RedisSchema } from "@/lib/adapters/definitions";
import { dump } from "./dump";
import { restore, prepareRestore } from "./restore";
import { test, getDatabases } from "./connection";
import { analyzeDump } from "./analyze";

export const RedisAdapter: DatabaseAdapter = {
    id: "redis",
    type: "database",
    name: "Redis",
    configSchema: RedisSchema,
    dump,
    restore,
    prepareRestore,
    test,
    getDatabases,
    analyzeDump
};
