import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEncryptionProfile, getDecryptedMasterKey, getProfileMasterKey } from '@/services/encryption-service';
import prisma from '@/lib/prisma';
import * as cryptoLib from '@/lib/crypto';
import crypto from 'crypto';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    encryptionProfile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

// We can spy on crypto.randomBytes to ensure deterministic key generation for testing
// Using a fixed 32-byte sequence
const FIXED_KEY_BUFFER = Buffer.from('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'hex');
vi.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => {
    if (size === 32) return FIXED_KEY_BUFFER;
    return Buffer.alloc(size);
});

describe('Encryption Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createEncryptionProfile', () => {
        it('should encrypt the generated master key before saving to DB', async () => {
            const mockEncrypted = 'encrypted-secret-value';
            (cryptoLib.encrypt as any).mockReturnValue(mockEncrypted);

            const fixedKeyHex = FIXED_KEY_BUFFER.toString('hex');

            (prisma.encryptionProfile.create as any).mockResolvedValue({ id: '1', name: 'Test', secretKey: mockEncrypted });

            await createEncryptionProfile('Test Profile', 'Desc');

            // 1. Verify encrypt was called with the HEX string of the random bytes
            expect(cryptoLib.encrypt).toHaveBeenCalledWith(fixedKeyHex);

            // 2. Verify DB create was called with the RESULT of encrypt(), NOT the raw key
            expect(prisma.encryptionProfile.create).toHaveBeenCalledWith({
                data: {
                    name: 'Test Profile',
                    description: 'Desc',
                    secretKey: mockEncrypted // Validation: Plaintext key never touches DB args
                }
            });

            // 3. Verify it never tried to save the fixedKeyHex directly
            expect(prisma.encryptionProfile.create).not.toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ secretKey: fixedKeyHex })
            }));
        });
    });

    describe('getDecryptedMasterKey', () => {
        it('should retrieve and decrypt the key', async () => {
            const mockProfile = { id: '1', secretKey: 'encrypted-stuff' };
            (prisma.encryptionProfile.findUnique as any).mockResolvedValue(mockProfile);
            (cryptoLib.decrypt as any).mockReturnValue('decrypted-hex-key');

            const result = await getDecryptedMasterKey('1');

            expect(prisma.encryptionProfile.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
            expect(cryptoLib.decrypt).toHaveBeenCalledWith('encrypted-stuff');
            expect(result).toBe('decrypted-hex-key');
        });

        it('should throw if profile not found', async () => {
             (prisma.encryptionProfile.findUnique as any).mockResolvedValue(null);
             await expect(getDecryptedMasterKey('missing')).rejects.toThrow('Encryption profile missing not found');
        });
    });

     describe('getProfileMasterKey', () => {
        it('should return the key as a Buffer', async () => {
            const mockProfile = { id: '1', secretKey: 'encrypted-stuff' };
            const fakeHexKey = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'; // 32 bytes hex

            (prisma.encryptionProfile.findUnique as any).mockResolvedValue(mockProfile);
            (cryptoLib.decrypt as any).mockReturnValue(fakeHexKey);

            const result = await getProfileMasterKey('1');

            expect(Buffer.isBuffer(result)).toBe(true);
            expect(result.toString('hex')).toBe(fakeHexKey);
            expect(result.length).toBe(32);
        });

        it('should throw integrity error if decrypted key is invalid length', async () => {
             const mockProfile = { id: '1', secretKey: 'encrypted-stuff' };
             (prisma.encryptionProfile.findUnique as any).mockResolvedValue(mockProfile);
             (cryptoLib.decrypt as any).mockReturnValue('short-key'); // Not 64 chars hex

             await expect(getProfileMasterKey('1')).rejects.toThrow('Integrity Error');
        });
    });
});
