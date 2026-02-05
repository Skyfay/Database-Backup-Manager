#!/usr/bin/env tsx
/**
 * Demo Seed Script
 * ================
 * Creates the initial DBackup database for the demo environment.
 *
 * This script:
 * 1. Creates the demo user with pre-defined credentials
 * 2. Sets up database sources (MySQL, PostgreSQL, MongoDB)
 * 3. Creates a local storage destination
 * 4. Configures sample backup jobs
 * 5. Creates permission groups
 *
 * Usage:
 *   pnpm tsx scripts/demo/seed-demo.ts
 *
 * The output database should be placed at scripts/demo/seed.db
 * for use by the docker-compose.demo.yml reset service.
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Demo configuration - must match docker-compose.demo.yml
const DEMO_CONFIG = {
  user: {
    email: "demo@dbackup.app",
    password: "demo123456",
    name: "Demo User",
  },
  databases: {
    mysql: {
      host: "mysql-demo",
      port: 3306,
      user: "root",
      password: "demorootpassword",
      databases: ["demo_app", "demo_analytics"],
    },
    postgres: {
      host: "postgres-demo",
      port: 5432,
      user: "demouser",
      password: "demopassword",
      databases: ["demo_app"],
    },
    mongodb: {
      host: "mongo-demo",
      port: 27017,
      user: "root",
      password: "demorootpassword",
      authSource: "admin",
      databases: ["demo_app"],
    },
  },
  storage: {
    path: "/backups",
  },
};

/**
 * Simple encryption function for demo purposes.
 * In production, this uses the ENCRYPTION_KEY env var.
 * For seeding, we use a placeholder that will be re-encrypted on first run.
 */
function encryptForDemo(value: string): string {
  // This is a placeholder - the actual encryption happens at runtime
  // We store values in a format that the app will recognize and re-encrypt
  return `DEMO_PLAINTEXT:${Buffer.from(value).toString("base64")}`;
}

async function main() {
  console.log("🌱 Seeding demo database...\n");

  // ==========================================
  // 1. Create Permission Groups
  // ==========================================
  console.log("📋 Creating permission groups...");

  const superAdminGroup = await prisma.group.upsert({
    where: { name: "SuperAdmin" },
    update: {},
    create: {
      id: randomUUID(),
      name: "SuperAdmin",
      permissions: JSON.stringify([
        "sources:read", "sources:write", "sources:delete",
        "destinations:read", "destinations:write", "destinations:delete",
        "jobs:read", "jobs:write", "jobs:delete", "jobs:execute",
        "history:read", "history:delete",
        "storage:read", "storage:delete", "storage:restore",
        "users:read", "users:write",
        "settings:read", "settings:write",
        "vault:read", "vault:write",
        "audit:read",
      ]),
    },
  });

  const viewerGroup = await prisma.group.upsert({
    where: { name: "Viewer" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Viewer",
      permissions: JSON.stringify([
        "sources:read",
        "destinations:read",
        "jobs:read",
        "history:read",
        "storage:read",
      ]),
    },
  });

  console.log(`   ✓ SuperAdmin group: ${superAdminGroup.id}`);
  console.log(`   ✓ Viewer group: ${viewerGroup.id}`);

  // ==========================================
  // 2. Create Demo User
  // ==========================================
  console.log("\n👤 Creating demo user...");

  const userId = randomUUID();
  const passwordHash = await hash(DEMO_CONFIG.user.password, 10);

  // Create user
  await prisma.user.upsert({
    where: { email: DEMO_CONFIG.user.email },
    update: {
      name: DEMO_CONFIG.user.name,
      groupId: superAdminGroup.id,
    },
    create: {
      id: userId,
      email: DEMO_CONFIG.user.email,
      name: DEMO_CONFIG.user.name,
      emailVerified: true,
      groupId: superAdminGroup.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create credential account for password login
  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: userId,
      },
    },
    update: {
      password: passwordHash,
    },
    create: {
      id: randomUUID(),
      userId: userId,
      providerId: "credential",
      accountId: userId,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✓ User: ${DEMO_CONFIG.user.email}`);
  console.log(`   ✓ Password: ${DEMO_CONFIG.user.password}`);

  // ==========================================
  // 3. Create Database Sources
  // ==========================================
  console.log("\n🗄️  Creating database sources...");

  // MySQL Source
  const mysqlConfig = {
    host: DEMO_CONFIG.databases.mysql.host,
    port: DEMO_CONFIG.databases.mysql.port,
    user: DEMO_CONFIG.databases.mysql.user,
    password: encryptForDemo(DEMO_CONFIG.databases.mysql.password),
    databases: DEMO_CONFIG.databases.mysql.databases,
  };

  const mysqlSource = await prisma.adapterConfig.upsert({
    where: { id: "demo-mysql-source" },
    update: { config: JSON.stringify(mysqlConfig) },
    create: {
      id: "demo-mysql-source",
      name: "MySQL Demo Server",
      type: "database",
      adapterId: "mysql",
      config: JSON.stringify(mysqlConfig),
      lastStatus: "ONLINE",
    },
  });
  console.log(`   ✓ MySQL: ${mysqlSource.name}`);

  // PostgreSQL Source
  const postgresConfig = {
    host: DEMO_CONFIG.databases.postgres.host,
    port: DEMO_CONFIG.databases.postgres.port,
    user: DEMO_CONFIG.databases.postgres.user,
    password: encryptForDemo(DEMO_CONFIG.databases.postgres.password),
    databases: DEMO_CONFIG.databases.postgres.databases,
  };

  const postgresSource = await prisma.adapterConfig.upsert({
    where: { id: "demo-postgres-source" },
    update: { config: JSON.stringify(postgresConfig) },
    create: {
      id: "demo-postgres-source",
      name: "PostgreSQL Demo Server",
      type: "database",
      adapterId: "postgresql",
      config: JSON.stringify(postgresConfig),
      lastStatus: "ONLINE",
    },
  });
  console.log(`   ✓ PostgreSQL: ${postgresSource.name}`);

  // MongoDB Source
  const mongoConfig = {
    host: DEMO_CONFIG.databases.mongodb.host,
    port: DEMO_CONFIG.databases.mongodb.port,
    user: DEMO_CONFIG.databases.mongodb.user,
    password: encryptForDemo(DEMO_CONFIG.databases.mongodb.password),
    authSource: DEMO_CONFIG.databases.mongodb.authSource,
    databases: DEMO_CONFIG.databases.mongodb.databases,
  };

  const mongoSource = await prisma.adapterConfig.upsert({
    where: { id: "demo-mongo-source" },
    update: { config: JSON.stringify(mongoConfig) },
    create: {
      id: "demo-mongo-source",
      name: "MongoDB Demo Server",
      type: "database",
      adapterId: "mongodb",
      config: JSON.stringify(mongoConfig),
      lastStatus: "ONLINE",
    },
  });
  console.log(`   ✓ MongoDB: ${mongoSource.name}`);

  // ==========================================
  // 4. Create Storage Destination
  // ==========================================
  console.log("\n💾 Creating storage destination...");

  const storageConfig = {
    path: DEMO_CONFIG.storage.path,
  };

  const localStorage = await prisma.adapterConfig.upsert({
    where: { id: "demo-local-storage" },
    update: { config: JSON.stringify(storageConfig) },
    create: {
      id: "demo-local-storage",
      name: "Local Backup Storage",
      type: "storage",
      adapterId: "local",
      config: JSON.stringify(storageConfig),
      lastStatus: "ONLINE",
    },
  });
  console.log(`   ✓ Storage: ${localStorage.name}`);

  // ==========================================
  // 5. Create Backup Jobs
  // ==========================================
  console.log("\n📦 Creating backup jobs...");

  // MySQL Daily Backup
  await prisma.job.upsert({
    where: { id: "demo-job-mysql-daily" },
    update: {},
    create: {
      id: "demo-job-mysql-daily",
      name: "MySQL Daily Backup",
      schedule: "0 2 * * *", // 2 AM daily
      enabled: true,
      sourceId: mysqlSource.id,
      destinationId: localStorage.id,
      compression: "GZIP",
      retention: JSON.stringify({
        type: "simple",
        keepLast: 7,
      }),
    },
  });
  console.log("   ✓ MySQL Daily Backup (2 AM, keep 7)");

  // PostgreSQL Hourly Backup
  await prisma.job.upsert({
    where: { id: "demo-job-postgres-hourly" },
    update: {},
    create: {
      id: "demo-job-postgres-hourly",
      name: "PostgreSQL Hourly Backup",
      schedule: "0 * * * *", // Every hour
      enabled: true,
      sourceId: postgresSource.id,
      destinationId: localStorage.id,
      compression: "GZIP",
      retention: JSON.stringify({
        type: "simple",
        keepLast: 24,
      }),
    },
  });
  console.log("   ✓ PostgreSQL Hourly Backup (every hour, keep 24)");

  // MongoDB Weekly Backup
  await prisma.job.upsert({
    where: { id: "demo-job-mongo-weekly" },
    update: {},
    create: {
      id: "demo-job-mongo-weekly",
      name: "MongoDB Weekly Backup",
      schedule: "0 3 * * 0", // 3 AM on Sundays
      enabled: true,
      sourceId: mongoSource.id,
      destinationId: localStorage.id,
      compression: "GZIP",
      retention: JSON.stringify({
        type: "gvs",
        daily: 7,
        weekly: 4,
        monthly: 3,
      }),
    },
  });
  console.log("   ✓ MongoDB Weekly Backup (Sunday 3 AM, GVS retention)");

  // Disabled job for demonstration
  await prisma.job.upsert({
    where: { id: "demo-job-disabled" },
    update: {},
    create: {
      id: "demo-job-disabled",
      name: "MySQL Monthly (Disabled)",
      schedule: "0 4 1 * *", // 4 AM on 1st of month
      enabled: false,
      sourceId: mysqlSource.id,
      destinationId: localStorage.id,
      compression: "NONE",
      retention: JSON.stringify({
        type: "simple",
        keepLast: 12,
      }),
    },
  });
  console.log("   ✓ MySQL Monthly (disabled, for demo purposes)");

  // ==========================================
  // 6. Create System Settings
  // ==========================================
  console.log("\n⚙️  Creating system settings...");

  await prisma.systemSetting.upsert({
    where: { key: "maxConcurrentJobs" },
    update: {},
    create: { key: "maxConcurrentJobs", value: "2" },
  });

  await prisma.systemSetting.upsert({
    where: { key: "audit.retentionDays" },
    update: {},
    create: { key: "audit.retentionDays", value: "30" },
  });

  console.log("   ✓ Max concurrent jobs: 2");
  console.log("   ✓ Audit retention: 30 days");

  // ==========================================
  // Summary
  // ==========================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ Demo database seeded successfully!");
  console.log("=".repeat(50));
  console.log("\nDemo Credentials:");
  console.log(`   Email:    ${DEMO_CONFIG.user.email}`);
  console.log(`   Password: ${DEMO_CONFIG.user.password}`);
  console.log("\nConfigured Resources:");
  console.log("   • 3 Database Sources (MySQL, PostgreSQL, MongoDB)");
  console.log("   • 1 Storage Destination (Local)");
  console.log("   • 4 Backup Jobs (3 enabled, 1 disabled)");
  console.log("   • 2 Permission Groups (SuperAdmin, Viewer)");
  console.log("\n📝 Note: The seed.db file should be copied to scripts/demo/seed.db");
  console.log("   for use with docker-compose.demo.yml\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
