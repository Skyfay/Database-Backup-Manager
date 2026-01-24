import prisma from "@/lib/prisma";
import { registry } from "@/lib/core/registry";
import { decryptConfig } from "@/lib/crypto";

export class HealthCheckService {
    async performHealthCheck() {
        console.log("[HealthCheck] Starting health check cycle...");
        const configs = await prisma.adapterConfig.findMany({
            where: {
                OR: [
                    { type: 'database' },
                    { type: 'storage' }
                ]
            }
        });

        for (const config of configs) {
            await this.checkAdapter(config);
        }

        // Retention Policy: Delete logs older than 48 hours
        try {
            const retentionDate = new Date();
            retentionDate.setHours(retentionDate.getHours() - 48);

            const deleted = await prisma.healthCheckLog.deleteMany({
                where: {
                    createdAt: {
                        lt: retentionDate
                    }
                }
            });
            if (deleted.count > 0) {
                console.log(`[HealthCheck] Cleanup: Deleted ${deleted.count} old logs.`);
            }
        } catch (e) {
            console.error("[HealthCheck] Failed to run log retention:", e);
        }

        console.log("[HealthCheck] Cycle completed.");
    }

    private async checkAdapter(configRow: any) {
        let latency = 0;
        let errorMsg: string | null = null;
        let success = false;

        try {
            const adapter = registry.get(configRow.adapterId);
            if (!adapter) {
                throw new Error(`Adapter ${configRow.adapterId} not found`);
            }

            if (!adapter.test) {
                // If ping/test not supported, we skip
                // console.warn(`[HealthCheck] Adapter ${configRow.adapterId} does not support test()`);
                return;
            }

             // Decrypt config
            let config;
            try {
                config = decryptConfig(JSON.parse(configRow.config));
            } catch(e: any) {
                throw new Error(`Config decrypt failed: ${e.message}`);
            }

            const start = Date.now();
            const result = await adapter.test(config);
            const end = Date.now();
            latency = end - start;

            success = result.success;
            if (!success) {
                errorMsg = result.message;
            }

        } catch (e: any) {
            success = false;
            errorMsg = e.message;
        }

        // Status Logic
        let newStatus = 'ONLINE';
        const consecutiveFailures = success ? 0 : (configRow.consecutiveFailures + 1);

        if (!success) {
            if (consecutiveFailures >= 3) {
                newStatus = 'OFFLINE';
            } else {
                newStatus = 'DEGRADED';
            }
        }

        try {
            // Update DB
            await prisma.$transaction([
                prisma.healthCheckLog.create({
                    data: {
                        adapterConfigId: configRow.id,
                        status: newStatus as any,
                        latencyMs: latency,
                        error: errorMsg
                    }
                }),
                prisma.adapterConfig.update({
                    where: { id: configRow.id },
                    data: {
                        lastHealthCheck: new Date(),
                        lastStatus: newStatus as any,
                        consecutiveFailures: consecutiveFailures
                    }
                })
            ]);
        } catch (e) {
            console.error(`[HealthCheck] Failed to update status for ${configRow.name}:`, e);
        }
    }
}

export const healthCheckService = new HealthCheckService();
