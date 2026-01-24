import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registry } from '@/lib/core/registry';
import { registerAdapters } from '@/lib/adapters';
import { DatabaseAdapter } from '@/lib/core/interfaces';
import { testDatabases } from './test-configs';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Integration Tests: Database Restore', () => {
    const tempDir = path.join(os.tmpdir(), 'dbm-integration-restore');

    beforeAll(() => {
        registerAdapters();
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    });

    afterAll(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    testDatabases.forEach(({ name, config }) => {
        describe(name, () => {
            const dumpFile = path.join(tempDir, `${name.replace(/\s+/g, '_')}_restore_source.sql`);

            it('should successfully restore a valid dump', async () => {
                const adapter = registry.get(config.type) as DatabaseAdapter;
                if (!adapter) throw new Error(`Adapter ${config.type} not found`);

                // 1. Create a fresh dump to restore from
                // We trust backup works (tested in backup.test.ts), but we need a file here.
                const dumpResult = await adapter.dump(
                    config as any,
                    dumpFile,
                );
                expect(dumpResult.success).toBe(true);
                expect(fs.existsSync(dumpFile)).toBe(true);

                // 2. Perform Restore (Round-trip)
                // Restoring back to the same DB (effectively a no-op data wise, but exercises the restore path)
                const restoreResult = await adapter.restore(
                    config as any,
                    dumpFile,
                    (_) => { /* console.log(progress) */ }
                );

                expect(restoreResult.success).toBe(true);
            }, 90000); // 1.5 min timeout (dump + restore)
        });
    });
});
