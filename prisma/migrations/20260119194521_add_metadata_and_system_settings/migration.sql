/*
  Warnings:

  - Added the required column `updatedAt` to the `SystemSetting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AdapterConfig" ADD COLUMN "metadata" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemSetting" ("key", "value") SELECT "key", "value" FROM "SystemSetting";
DROP TABLE "SystemSetting";
ALTER TABLE "new_SystemSetting" RENAME TO "SystemSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
