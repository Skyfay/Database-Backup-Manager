import os from "os";
import path from "path";

/**
 * Get the temporary directory path.
 * Uses TMPDIR environment variable if set, otherwise falls back to os.tmpdir().
 *
 * This allows users to mount a custom temp directory (e.g., NFS storage)
 * for large backup operations.
 */
export function getTempDir(): string {
  return process.env.TMPDIR || os.tmpdir();
}

/**
 * Generate a temporary file path with the given filename.
 */
export function getTempPath(filename: string): string {
  return path.join(getTempDir(), filename);
}
