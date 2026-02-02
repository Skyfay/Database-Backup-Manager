/**
 * Analyze a Redis RDB dump file
 *
 * RDB is a binary format that contains all databases.
 * Full parsing would require implementing the RDB format parser.
 *
 * For now, we return an empty array as Redis RDB always contains
 * all databases (0-15) and selective restore is not supported.
 */
export async function analyzeDump(_sourcePath: string): Promise<string[]> {
    // Redis RDB files always contain all databases
    // We cannot easily determine which databases have data without
    // implementing a full RDB parser
    //
    // Return empty array - the caller should use getDatabases()
    // on the target server instead

    return [];
}
