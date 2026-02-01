import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registry } from '@/lib/core/registry';
import { registerAdapters } from '@/lib/adapters';
import { DatabaseAdapter } from '@/lib/core/interfaces';
import { testDatabases, limitedDatabases } from './test-configs';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Integration Tests: Database Backup', () => {
    const tempDir = path.join(os.tmpdir(), 'dbm-integration-backup');

    beforeAll(() => {
        registerAdapters();
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Cleanup
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    testDatabases.forEach(({ name, config }) => {
        // Skip known limited databases (e.g., Azure SQL Edge on ARM64)
        const shouldSkip = limitedDatabases.includes(name);

        describe(name, () => {

            it.skipIf(shouldSkip)('should successfully perform a dump', async () => {
                const adapter = registry.get(config.type) as DatabaseAdapter;
                if (!adapter) throw new Error(`Adapter ${config.type} not found`);

                const dumpFile = path.join(tempDir, `${name.replace(/\s+/g, '_')}_dump.sql`);

                // Ensure clean state
                if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);

                const result = await adapter.dump(
                    config as any,
                    dumpFile,
                    (_) => { /* console.log(progress) */ }
                );

                expect(result.success).toBe(true); // Should return true on success
                expect(fs.existsSync(dumpFile)).toBe(true);

                const stats = fs.statSync(dumpFile);
                expect(stats.size).toBeGreaterThan(0);

                // console.log(`Dump size for ${name}: ${stats.size} bytes`);
            }, 60000); // 1 minute timeout for dump
        });
    });
});
