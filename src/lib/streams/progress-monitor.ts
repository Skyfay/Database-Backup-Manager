import { Transform, TransformCallback } from 'stream';

/**
 * A PassThrough stream that tracks the number of bytes processed
 * and calls a callback function periodically.
 */
export class ProgressMonitorStream extends Transform {
    private processedBytes = 0;
    private totalBytes: number;
    private onProgress: (processed: number, total: number, percent: number) => void;
    private lastUpdate = 0;
    private interval = 300; // ms throttle

    constructor(
        totalBytes: number,
        onProgress: (processed: number, total: number, percent: number) => void
    ) {
        super();
        this.totalBytes = totalBytes;
        this.onProgress = onProgress;
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
        this.processedBytes += chunk.length;
        this.push(chunk);

        const now = Date.now();
        if (now - this.lastUpdate > this.interval) {
            this.emitProgress();
            this.lastUpdate = now;
        }

        callback();
    }

    _flush(callback: TransformCallback) {
        this.emitProgress(); // Final update
        callback();
    }

    private emitProgress() {
        const percent = this.totalBytes > 0
            ? Math.round((this.processedBytes / this.totalBytes) * 100)
            : 0;
        this.onProgress(this.processedBytes, this.totalBytes, percent);
    }
}
