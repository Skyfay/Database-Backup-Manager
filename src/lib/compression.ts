import { createGzip, createGunzip, createBrotliCompress, createBrotliDecompress } from 'zlib';
import { Transform } from 'stream';

export type CompressionType = 'NONE' | 'GZIP' | 'BROTLI';

/**
 * Returns a Transform stream for the specified compression type.
 * Returns null if no compression is requested.
 */
export function getCompressionStream(type: string): Transform | null {
    switch (type) {
        case 'GZIP':
            return createGzip();
        case 'BROTLI':
            return createBrotliCompress();
        case 'NONE':
        default:
            return null;
    }
}

/**
 * Returns a Transform stream for the specified decompression type.
 * Returns null if no decompression is needed (NONE).
 */
export function getDecompressionStream(type: string): Transform | null {
    switch (type) {
        case 'GZIP':
            return createGunzip();
        case 'BROTLI':
            return createBrotliDecompress();
        case 'NONE':
        default:
            return null;
    }
}

/**
 * Returns the file extension for the specified compression type.
 * e.g. GZIP -> ".gz"
 */
export function getCompressionExtension(type: string): string {
    switch (type) {
        case 'GZIP': return '.gz';
        case 'BROTLI': return '.br';
        default: return '';
    }
}
