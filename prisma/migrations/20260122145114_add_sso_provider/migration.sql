-- CreateTable
CREATE TABLE "sso_provider" (
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
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "sso_provider_providerId_key" ON "sso_provider"("providerId");
