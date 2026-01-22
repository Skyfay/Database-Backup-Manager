-- AlterTable
ALTER TABLE "sso_provider" ADD COLUMN "domain" TEXT;
ALTER TABLE "sso_provider" ADD COLUMN "oidcConfig" TEXT;
ALTER TABLE "sso_provider" ADD COLUMN "samlConfig" TEXT;
