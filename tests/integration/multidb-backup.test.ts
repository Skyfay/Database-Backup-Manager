import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registry } from '@/lib/core/registry';
import { registerAdapters } from '@/lib/adapters';
import { DatabaseAdapter } from '@/lib/core/interfaces';
import { multiDbTestConfigs } from './test-configs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { extract } from 'tar-stream';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

describe('Integration Tests: Multi-Database Backup', () => {
    const tempDir = path.join(os.tmpdir(), 'dbm-integration-multidb');

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

            it('should create a TAR archive with multiple databases', async () => {
                const adapter = registry.get(config.type) as DatabaseAdapter;
                if (!adapter) throw new Error(`Adapter ${config.type} not found`);

                const dumpFile = path.join(tempDir, `${name.replace(/\s+/g, '_')}_multidb.tar`);

                // Ensure clean state
                if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);

                const result = await adapter.dump(
                    config as any,
                    dumpFile,
                    (_) => { /* console.log(progress) */ }
                );

                expect(result.success).toBe(true);
                expect(fs.existsSync(dumpFile)).toBe(true);

                const stats = fs.statSync(dumpFile);
                expect(stats.size).toBeGreaterThan(0);

                // Verify it's a valid TAR archive with manifest
                const entries = await extractTarEntries(dumpFile);
                expect(entries).toContain('manifest.json');

                // Should have at least 2 database dumps (plus manifest)
                expect(entries.length).toBeGreaterThanOrEqual(3);
            }, 60000);

            it('should include manifest.json with correct structure', async () => {
                const adapter = registry.get(config.type) as DatabaseAdapter;
                if (!adapter) throw new Error(`Adapter ${config.type} not found`);

                const dumpFile = path.join(tempDir, `${name.replace(/\s+/g, '_')}_manifest_test.tar`);

                // Ensure clean state
                if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);

                await adapter.dump(config as any, dumpFile, () => {});

                // Extract and verify manifest
                const manifest = await extractManifestFromTar(dumpFile);

                expect(manifest).toBeDefined();
                expect(manifest.version).toBeDefined();
                expect(manifest.createdAt).toBeDefined();
                expect(manifest.databases).toBeDefined();
                expect(Array.isArray(manifest.databases)).toBe(true);
                expect(manifest.databases.length).toBeGreaterThanOrEqual(2);

                // Each database entry should have name and filename
                for (const db of manifest.databases) {
                    expect(db.name).toBeDefined();
                    expect(db.filename).toBeDefined();
                }
            }, 60000);

        });
    });
});

// Helper: Extract TAR entry names
async function extractTarEntries(tarPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const entries: string[] = [];
        const extractor = extract();

        extractor.on('entry', (header, stream, next) => {
            entries.push(header.name);
            stream.on('end', next);
            stream.resume();
        });

        extractor.on('finish', () => resolve(entries));
        extractor.on('error', reject);

        pipeline(createReadStream(tarPath), extractor).catch(reject);
    });
}

// Helper: Extract manifest.json from TAR
async function extractManifestFromTar(tarPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const extractor = extract();
        let manifest: any = null;

        extractor.on('entry', (header, stream, next) => {
            if (header.name === 'manifest.json') {
                const chunks: Buffer[] = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => {
                    const content = Buffer.concat(chunks).toString('utf-8');
                    manifest = JSON.parse(content);
                    next();
                });
            } else {
                stream.on('end', next);
                stream.resume();
            }
        });

        extractor.on('finish', () => resolve(manifest));
        extractor.on('error', reject);

        pipeline(createReadStream(tarPath), extractor).catch(reject);
    });
}
