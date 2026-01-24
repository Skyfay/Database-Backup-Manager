import { StorageAdapter, FileInfo } from "@/lib/core/interfaces";
import { SFTPSchema } from "@/lib/adapters/definitions";
import Client from "ssh2-sftp-client";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { LogLevel, LogType } from "@/lib/core/logs";

interface SFTPConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    pathPrefix?: string;
}

const connectSFTP = async (config: SFTPConfig): Promise<Client> => {
    const sftp = new Client();
    await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
    });
    return sftp;
};

export const SFTPStorageAdapter: StorageAdapter = {
    id: "sftp",
    type: "storage",
    name: "SFTP (SSH)",
    configSchema: SFTPSchema,

    async upload(config: SFTPConfig, localPath: string, remotePath: string, onProgress?: (percent: number) => void, onLog?: (msg: string, level?: LogLevel, type?: LogType, details?: string) => void): Promise<boolean> {
        let sftp: Client | null = null;
        try {
            sftp = await connectSFTP(config);
            if (onLog) onLog(`Connected to SFTP ${config.host}:${config.port}`, 'info', 'storage');

            const destination = config.pathPrefix
                ? path.posix.join(config.pathPrefix, remotePath)
                : remotePath;

            // Ensure directory exists
            const remoteDir = path.posix.dirname(destination);
            if (await sftp.exists(remoteDir) !== 'd') {
                if (onLog) onLog(`Creating remote directory: ${remoteDir}`, 'info', 'storage');
                await sftp.mkdir(remoteDir, true);
            }

            if (onLog) onLog(`Starting SFTP upload to: ${destination}`, 'info', 'storage');

            // Use fastPut for local files (more efficient than streams for files on disk)
            // or put with fs stream if we want better progress tracking support?
            // ssh2-sftp-client put() supports streams and returns promise.
            // But fastPut is faster for file-to-file.
            // Let's use put() with ReadStream to match our architecture and handle progress if possible (though ssh2-sftp-client progress is step based usually).

            // Actually, put() accepts a stream.
            const stats = await import('fs').then(fs => fs.promises.stat(localPath));
            const totalSize = stats.size;

            // Note: ssh2-sftp-client default 'step' progress might not be granualr enough for small files, but works.
            // However, the signature is (total_transferred, chunk, total).

            await sftp.put(createReadStream(localPath), destination, {
                step: (total_transferred, chunk, total) => {
                    if (onProgress && totalSize > 0) {
                        // total param in callback is total bytes to transfer, which is known if we pass it, but put() with stream might not know it unless we checked.
                        // We use our known totalSize.
                        const percent = Math.round((total_transferred / totalSize) * 100);
                        onProgress(percent);
                    }
                }
            });

            if (onLog) onLog(`SFTP upload completed successfully`, 'info', 'storage');
            return true;
        } catch (error: any) {
            console.error("SFTP upload failed:", error);
            if (onLog) onLog(`SFTP upload failed: ${error.message}`, 'error', 'storage', error.stack);
            return false;
        } finally {
            if (sftp) await sftp.end();
        }
    },

    async list(config: SFTPConfig, dir: string = ""): Promise<FileInfo[]> {
        let sftp: Client | null = null;
        try {
            sftp = await connectSFTP(config);

            const remoteDir = config.pathPrefix
                ? path.posix.join(config.pathPrefix, dir)
                : dir || ".";

            const fileList = await sftp.list(remoteDir);

            return fileList
                .filter(f => f.type !== 'd') // Filter out directories
                .map(f => ({
                    name: f.name,
                    path: path.posix.join(dir, f.name), // Relative path for UI
                    size: f.size,
                    modTime: new Date(f.modifyTime),
                }));
        } catch (error) {
            console.error("SFTP list failed:", error);
            return [];
        } finally {
            if (sftp) await sftp.end();
        }
    },

    async download(config: SFTPConfig, remotePath: string, localPath: string): Promise<boolean> {
        let sftp: Client | null = null;
        try {
            sftp = await connectSFTP(config);

            const source = config.pathPrefix
                ? path.posix.join(config.pathPrefix, remotePath)
                : remotePath;

            await sftp.get(source, localPath);
            return true;
        } catch (error) {
            console.error("SFTP download failed:", error);
            return false;
        } finally {
            if (sftp) await sftp.end();
        }
    },

    async read(config: SFTPConfig, remotePath: string): Promise<string | null> {
        let sftp: Client | null = null;
        try {
            sftp = await connectSFTP(config);

            const source = config.pathPrefix
                ? path.posix.join(config.pathPrefix, remotePath)
                : remotePath;

            // get returns Buffer or string depending on options/destination
            // passing undefined as dst makes it return a buffer
            const buffer = await sftp.get(source);
            if (buffer instanceof Buffer) {
                return buffer.toString('utf-8');
            }
            return null;
        } catch (error) {
            // Quietly fail if file not found (expected for missing .meta.json)
            return null;
        } finally {
            if (sftp) await sftp.end();
        }
    },

    async delete(config: SFTPConfig, remotePath: string): Promise<boolean> {
        let sftp: Client | null = null;
        try {
            sftp = await connectSFTP(config);

            const source = config.pathPrefix
                ? path.posix.join(config.pathPrefix, remotePath)
                : remotePath;

            await sftp.delete(source);
            return true;
        } catch (error) {
            console.error("SFTP delete failed:", error);
            return false;
        } finally {
            if (sftp) await sftp.end();
        }
    },

    async test(config: SFTPConfig): Promise<{ success: boolean; message: string }> {
        let sftp: Client | null = null;
        try {
            sftp = await connectSFTP(config);
            const cwd = await sftp.cwd();
            return { success: true, message: `Connected successfully. CWD: ${cwd}` };
        } catch (error: any) {
            return { success: false, message: error.message || "Connection failed" };
        } finally {
            if (sftp) await sftp.end();
        }
    }
};
