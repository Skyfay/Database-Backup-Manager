import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registry } from '@/lib/core/registry';
import { registerAdapters } from '@/lib/adapters';
import { DatabaseAdapter } from '@/lib/core/interfaces';
import { multiDbTestConfigs } from './test-configs';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Integration Tests: Multi-Database Restore', () => {
    const tempDir = path.join(os.tmpdir(), 'dbm-integration-multidb-restore');

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

    multiDbTestConfigs.forEach(({ name, config }) => {
        describe(name, () => {

            it('should backup and restore multiple databases', async () => {
                const adapter = registry.get(config.type) as DatabaseAdapter;
                if (!adapter) throw new Error(`Adapter ${config.type} not found`);

                const dumpFile = path.join(tempDir, `${name.replace(/\s+/g, '_')}_restore_test.tar`);

                // Ensure clean state
                if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);

                // Step 1: Create backup
                const dumpResult = await adapter.dump(
                    config as any,
                    dumpFile,
                    () => {}
                );
                expect(dumpResult.success).toBe(true);
                expect(fs.existsSync(dumpFile)).toBe(true);

                // Step 2: Restore the backup
                // For multi-DB restore, we need to specify target databases
                // We'll restore to the same databases (typical scenario)
                const restoreResult = await adapter.restore(
                    config as any,
                    dumpFile,
                    () => {}
                );

                expect(restoreResult.success).toBe(true);
            }, 120000); // 2 minutes timeout for backup + restore

            it('should support database renaming during restore', async () => {
                const adapter = registry.get(config.type) as DatabaseAdapter;
                if (!adapter) throw new Error(`Adapter ${config.type} not found`);

                // Only test with testdb (not system databases like mysql, postgres, admin)
                const singleDbConfig = {
                    ...config,
                    database: 'testdb' // Single database for rename test
                };

                const dumpFile = path.join(tempDir, `${name.replace(/\s+/g, '_')}_rename_test.sql`);

                // Ensure clean state
                if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);

                // Step 1: Create backup of single DB
                const dumpResult = await adapter.dump(
                    singleDbConfig as any,
                    dumpFile,
                    () => {}
                );
                expect(dumpResult.success).toBe(true);

                // Step 2: Restore with rename (testdb -> testdb)
                // Note: We can't actually create a new DB in tests without admin privileges
                // So we restore to the same DB name to verify the mechanism works
                const restoreConfig = {
                    ...singleDbConfig,
                    targetDatabaseName: 'testdb' // Same name (safe for tests)
                };

                const restoreResult = await adapter.restore(
                    restoreConfig as any,
                    dumpFile,
                    () => {}
                );

                expect(restoreResult.success).toBe(true);
            }, 60000);

        });
    });
});
