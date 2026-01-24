import { describe, it, expect } from 'vitest';
import { getCompressionStream, getDecompressionStream, getCompressionExtension } from '@/lib/compression';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Helper to accumulate stream output into a Buffer
// async function streamToBuffer removed (unused)


describe('Compression Library', () => {

    describe('Extensions', () => {
        it('should return correct extensions', () => {
            expect(getCompressionExtension('GZIP')).toBe('.gz');
            expect(getCompressionExtension('BROTLI')).toBe('.br');
            expect(getCompressionExtension('NONE')).toBe('');
            expect(getCompressionExtension('UNKNOWN')).toBe('');
        });
    });

    describe('GZIP', () => {
        it('should successfully round-trip (compress -> decompress)', async () => {
            const inputString = "Hello Gzip World!";
            const compressStream = getCompressionStream('GZIP');
            const decompressStream = getDecompressionStream('GZIP');

            if (!compressStream || !decompressStream) {
                throw new Error("Failed to create streams");
            }

            // pipe input -> compress -> decompress
            // We can't easily pipe two transforms directly in unit tests without a proper sink.
            // Let's do it in two steps to be safe and inspect the middle state if needed.

            // 1. Compress
            const compressedChunks: Buffer[] = [];
            await pipeline(
                Readable.from([inputString]),
                compressStream,
                async function (source) {
                    for await (const chunk of source) {
                        compressedChunks.push(Buffer.from(chunk));
                    }
                }
            );
            const compressedBuffer = Buffer.concat(compressedChunks);

            // Verify it is actually compressed (not empty, and likely different from input)
            expect(compressedBuffer.length).toBeGreaterThan(0);
            expect(compressedBuffer.toString()).not.toBe(inputString);

            // 2. Decompress
            const decompressedChunks: Buffer[] = [];
            await pipeline(
                Readable.from([compressedBuffer]),
                decompressStream,
                async function (source) {
                    for await (const chunk of source) {
                        decompressedChunks.push(Buffer.from(chunk));
                    }
                }
            );
            const outputString = Buffer.concat(decompressedChunks).toString();

            expect(outputString).toBe(inputString);
        });
    });

    describe('BROTLI', () => {
        it('should successfully round-trip (compress -> decompress)', async () => {
            const inputString = "Hello Brotli World! repeated repeated repeated";
            const compressStream = getCompressionStream('BROTLI');
            const decompressStream = getDecompressionStream('BROTLI');

            if (!compressStream || !decompressStream) {
                throw new Error("Failed to create streams");
            }

            // 1. Compress
            const compressedChunks: Buffer[] = [];
            await pipeline(
                Readable.from([inputString]),
                compressStream,
                async function (source) {
                    for await (const chunk of source) {
                        compressedChunks.push(Buffer.from(chunk));
                    }
                }
            );
            const compressedBuffer = Buffer.concat(compressedChunks);

            expect(compressedBuffer.length).toBeGreaterThan(0);

            // 2. Decompress
            const decompressedChunks: Buffer[] = [];
            await pipeline(
                Readable.from([compressedBuffer]),
                decompressStream,
                async function (source) {
                    for await (const chunk of source) {
                        decompressedChunks.push(Buffer.from(chunk));
                    }
                }
            );
            const outputString = Buffer.concat(decompressedChunks).toString();

            expect(outputString).toBe(inputString);
        });
    });

    describe('NONE', () => {
        it('should return null for NONE type', () => {
            expect(getCompressionStream('NONE')).toBeNull();
            expect(getDecompressionStream('NONE')).toBeNull();
        });
    });
});
