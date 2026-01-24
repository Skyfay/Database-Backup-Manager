-- CreateTable
CREATE TABLE "HealthCheckLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adapterConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthCheckLog_adapterConfigId_fkey" FOREIGN KEY ("adapterConfigId") REFERENCES "AdapterConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdapterConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "adapterId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastHealthCheck" DATETIME,
    "lastStatus" TEXT NOT NULL DEFAULT 'ONLINE',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_AdapterConfig" ("adapterId", "config", "createdAt", "id", "metadata", "name", "type", "updatedAt") SELECT "adapterId", "config", "createdAt", "id", "metadata", "name", "type", "updatedAt" FROM "AdapterConfig";
DROP TABLE "AdapterConfig";
ALTER TABLE "new_AdapterConfig" RENAME TO "AdapterConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "HealthCheckLog_adapterConfigId_createdAt_idx" ON "HealthCheckLog"("adapterConfigId", "createdAt");
