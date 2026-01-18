import prisma from "@/lib/prisma";
import { registry } from "@/lib/core/registry";
import { registerAdapters } from "@/lib/adapters";
import { StorageAdapter, DatabaseAdapter } from "@/lib/core/interfaces";
import { decryptConfig } from "@/lib/crypto";
import path from "path";
import os from "os";
import fs from "fs";

// Ensure adapters are loaded
registerAdapters();

export interface RestoreInput {
    storageConfigId: string;
    file: string;
    targetSourceId: string;
    targetDatabaseName?: string;
    databaseMapping?: Record<string, string>;
    privilegedAuth?: {
        username?: string;
        password?: string;
    };
}

export class RestoreService {
    async restore(input: RestoreInput) {
        const { storageConfigId, file, targetSourceId, targetDatabaseName, databaseMapping, privilegedAuth } = input;

        // Start Logging Execution
        const execution = await prisma.execution.create({
            data: {
                type: 'Restore',
                status: 'Running',
                logs: JSON.stringify([`Starting restore for ${file}`]),
                startedAt: new Date(),
                path: file
            }
        });
        const executionId = execution.id;
        let tempFile: string | null = null;

        try {
            if (!file || !targetSourceId) {
                throw new Error("Missing file or targetSourceId");
            }

            // 1. Get Storage Adapter
            const storageConfig = await prisma.adapterConfig.findUnique({ where: { id: storageConfigId } });
            if (!storageConfig || storageConfig.type !== "storage") {
                throw new Error("Storage adapter not found");
            }

            const storageAdapter = registry.get(storageConfig.adapterId) as StorageAdapter;
            if (!storageAdapter) {
                throw new Error("Storage impl missing");
            }

            // 2. Get Source Adapter
            const sourceConfig = await prisma.adapterConfig.findUnique({ where: { id: targetSourceId } });
            if (!sourceConfig || sourceConfig.type !== "database") {
                throw new Error("Source adapter not found");
            }

            const sourceAdapter = registry.get(sourceConfig.adapterId) as DatabaseAdapter;
            if (!sourceAdapter) {
                throw new Error("Source impl missing");
            }

            // 3. Download File
            const tempDir = os.tmpdir();
            tempFile = path.join(tempDir, path.basename(file));

            const sConf = decryptConfig(JSON.parse(storageConfig.config));
            const downloadSuccess = await storageAdapter.download(sConf, file, tempFile);

            if (!downloadSuccess) {
                throw new Error("Failed to download file from storage");
            }

            // 4. Restore
            const dbConf = decryptConfig(JSON.parse(sourceConfig.config));

            // Override database name if provided
            if (targetDatabaseName) {
                dbConf.database = targetDatabaseName;
            }

            // Pass database mapping if provided
            if (databaseMapping) {
                dbConf.databaseMapping = databaseMapping;
            }

            // Add privileged auth if provided
            if (privilegedAuth) {
                dbConf.privilegedAuth = privilegedAuth;
            }

            const restoreResult = await sourceAdapter.restore(dbConf, tempFile);

            if (!restoreResult.success) {
                await prisma.execution.update({
                    where: { id: executionId },
                    data: {
                        status: 'Failed',
                        endedAt: new Date(),
                        logs: JSON.stringify(restoreResult.logs)
                    }
                });
                return { success: false, logs: restoreResult.logs, error: restoreResult.error };
            }

            await prisma.execution.update({
                where: { id: executionId },
                data: {
                    status: 'Success',
                    endedAt: new Date(),
                    logs: JSON.stringify(restoreResult.logs)
                }
            });

            return { success: true, logs: restoreResult.logs };

        } catch (error: any) {
            console.error("Restore service error:", error);
            await prisma.execution.update({
                where: { id: executionId },
                data: { status: 'Failed', endedAt: new Date(), logs: JSON.stringify([`Error: ${error.message}`]) }
            });
            throw error;
        } finally {
            if (tempFile && fs.existsSync(tempFile)) {
                try { fs.unlinkSync(tempFile); } catch {}
            }
        }
    }
}

export const restoreService = new RestoreService();
