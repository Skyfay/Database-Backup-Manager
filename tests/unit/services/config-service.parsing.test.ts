import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '../../../src/services/config-service';
import { PassThrough } from 'stream';
import * as fs from 'fs';

// -- MOCKS --

// 1. Mock FS
vi.mock('fs', async () => {
    const createReadStream = vi.fn();
    const promises = {
        stat: vi.fn(),
        readFile: vi.fn(),
    };
    return {
        createReadStream,
        promises,
        default: { createReadStream, promises }
    }
});

// 2. Mock Zlib
vi.mock('zlib', () => {
    const createGunzip = vi.fn().mockImplementation(() => {
        const pt = new PassThrough();
        return pt;
    });
    return {
        createGunzip,
        default: { createGunzip }
    };
});

// 3. Mock Crypto Stream
vi.mock('@/lib/crypto-stream', () => ({
    createDecryptionStream: vi.fn().mockImplementation(() => {
        const pt = new PassThrough();
        return pt;
    })
}));

// 4. Mock Encryption Service
vi.mock('@/services/encryption-service', () => ({
    getProfileMasterKey: vi.fn().mockResolvedValue(Buffer.from('mock-key')),
}));

// 5. Mock Prisma
vi.mock('@/lib/prisma', () => ({ default: {} }));

// Imports for assertions
import { createReadStream } from 'fs';
import { createDecryptionStream } from '@/lib/crypto-stream';
import { createGunzip } from 'zlib';

describe('ConfigService Parsing (Offline Restore)', () => {
    let service: ConfigService;

    beforeEach(() => {
        service = new ConfigService();
        vi.clearAllMocks();
    });

    const mockFileContent = JSON.stringify({
        metadata: { sourceType: 'SYSTEM', version: '1.0' },
        settings: []
    });

    const setupFsMock = (content: string, metaContent?: string) => {
        // Mock File Read Stream
        const stream = new PassThrough();
        stream.write(content);
        stream.end();
        (createReadStream as any).mockReturnValue(stream);

        // Mock Stat & ReadFile for Metadata
        if (metaContent) {
            (fs.promises.stat as any).mockResolvedValue({ isFile: () => true });
            (fs.promises.readFile as any).mockResolvedValue(metaContent);
        } else {
            (fs.promises.stat as any).mockRejectedValue(new Error("No Ent"));
        }
    };

    it('should parse a plain JSON backup file', async () => {
        setupFsMock(mockFileContent);

        const result = await service.parseBackupFile('backup.json');

        expect(result).toBeDefined();
        expect(result.metadata.sourceType).toBe('SYSTEM');
        expect(createGunzip).not.toHaveBeenCalled();
        expect(createDecryptionStream).not.toHaveBeenCalled();
    });

    it('should detect compression by extension and attach Gunzip', async () => {
        setupFsMock(mockFileContent);

        const result = await service.parseBackupFile('backup.json.gz');

        expect(createGunzip).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    it('should handle Encrypted Backup with Standard Metadata', async () => {
        setupFsMock(mockFileContent, JSON.stringify({
            encryption: {
                enabled: true,
                profileId: 'p1',
                iv: '1234',
                authTag: '5678'
            },
            compression: 'GZIP'
        }));

        const result = await service.parseBackupFile('backup.json.gz.enc', 'backup.json.gz.enc.meta.json');

        expect(createDecryptionStream).toHaveBeenCalledWith(
            expect.anything(), // Key (Buffer)
            Buffer.from('1234', 'hex'),
            Buffer.from('5678', 'hex')
        );
        expect(createGunzip).toHaveBeenCalled(); // .gz is in name
        expect(result).toBeDefined();
    });

    it('should handle Encrypted Backup with Legacy/Config Metadata (Flat)', async () => {
        setupFsMock(mockFileContent, JSON.stringify({
            encryptionProfileId: 'p1',
            iv: 'aabb',
            authTag: 'ccdd'
        }));

        const result = await service.parseBackupFile('backup.enc', 'backup.enc.meta.json');

        expect(createDecryptionStream).toHaveBeenCalledWith(
            expect.anything(),
            Buffer.from('aabb', 'hex'),
            Buffer.from('ccdd', 'hex')
        );
        expect(result).toBeDefined();
    });

    it('should throw if Encrypted file is missing metadata (IV/AuthTag)', async () => {
         setupFsMock(mockFileContent); // No metadata sidecar

         // It sees .enc extension, tries to set up crypto, but fails due to missing params
         await expect(service.parseBackupFile('backup.enc'))
            .rejects
            .toThrow("Encrypted backup detected but metadata (IV/AuthTag/Profile) is missing");
    });
});
