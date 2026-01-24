import { DatabaseDialect } from "../../common/dialect";
import { MongoDBBaseDialect } from "./mongodb-base";

export function getDialect(_adapterId: string, _version?: string): DatabaseDialect {
    return new MongoDBBaseDialect();
}
