-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sso_provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'oidc',
    "issuer" TEXT,
    "authorizationEndpoint" TEXT,
    "tokenEndpoint" TEXT,
    "userInfoEndpoint" TEXT,
    "jwksEndpoint" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "adapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowProvisioning" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_sso_provider" ("adapterId", "authorizationEndpoint", "clientId", "clientSecret", "createdAt", "enabled", "id", "issuer", "jwksEndpoint", "name", "providerId", "tokenEndpoint", "type", "updatedAt", "userId", "userInfoEndpoint") SELECT "adapterId", "authorizationEndpoint", "clientId", "clientSecret", "createdAt", "enabled", "id", "issuer", "jwksEndpoint", "name", "providerId", "tokenEndpoint", "type", "updatedAt", "userId", "userInfoEndpoint" FROM "sso_provider";
DROP TABLE "sso_provider";
ALTER TABLE "new_sso_provider" RENAME TO "sso_provider";
CREATE UNIQUE INDEX "sso_provider_providerId_key" ON "sso_provider"("providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
