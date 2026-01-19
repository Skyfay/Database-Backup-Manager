# Testing Infrastructure & Strategy

This documentation explains the testing architecture of the **Database Backup Manager**. We use a combination of Unit Tests, Integration Tests, and automated UI Seeding to ensure robustness across many database versions.

## 📂 Test Structure

```
tests/
├── unit/               # Fast, isolated tests for utility logic (SemVer, Formatting, etc.)
├── integration/        # Heavy tests against REAL running database containers
│   ├── test-configs.ts # Source of Truth: Configuration for all test databases
│   └── *.test.ts       # Test files (Connectivity, Backup, Restore)
└── README.md           # This file
```

---

## 🚀 Running Tests

### 1. Unit Tests
Fast checks for logic that doesn't need a database.
```bash
pnpm test
```

### 2. Integration Tests
Runs the full suite against **16+ real database containers**.
*   **Prerequisite**: Docker must be running.
*   **What happens**: Auto-starts containers -> Runs Tests -> Shuts down.
```bash
pnpm run test:integration
```

### 3. UI Development Mode (Test Area)
Want to manually test backups in the browser against real databases?
```bash
pnpm run test:ui
```
**What this does:**
1.  Starts all 16 database containers (MySQL 5-9, Postgres 12-17, Mongo 4-8).
2.  **Seeds** your local SQLite database with connections to all these containers (`Test MySQL 5.7`, `Test PG 16`...).
3.  Starts the Next.js dev server.
4.  You can open `http://localhost:3000` and immediately start backing up/restoring without manual setup.

---

## 🛠 Adding a New Database Version

When you need to support or test a new database version (e.g., *PostgreSQL 18* or *Redis*), follow these **3 Steps**:

### Step 1: Add Container to `docker-compose.test.yml`
Define the service. **Crucial**: Ensure you assign a **unique host port** (e.g., if 54417 is taken, use 54418).

```yaml
  # In root/docker-compose.test.yml
  postgres-18:
    image: postgres:18-alpine # Use official image
    container_name: dbm-test-pg-18
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpassword
    ports:
      - "54418:5432" # <--- UNIQUE PORT
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### Step 2: Register in `tests/integration/test-configs.ts`
This file is the **Source of Truth**. Both the integration tests AND the UI seeder read from here.

```typescript
// tests/integration/test-configs.ts
export const testDatabases = [
    // ... existing ...
    {
        name: 'Test PostgreSQL 18',
        config: {
            type: 'postgres',
            host: 'localhost',
            port: 54418, // Must match Docker Compose port
            user: 'testuser',
            password: 'testpassword',
            database: 'testdb'
        }
    }
];
```

### Step 3: Verify
Run the UI test command. The new database should appear in your Dashboard automatically.
```bash
pnpm run test:ui
```

---

## 🧩 How It Works Under the Hood

### The `test-configs.ts` File
This is the bridge between infrastructure (Docker) and Application (Next.js).
*   **Integration Tests** iterate over this array to run `connectivity.test.ts` against every defined DB.
*   **Seeding Script** (`scripts/seed-test-sources.ts`) iterates over this array to INSERT `AdapterConfig` rows into your local SQLite DB.

### Port Management
We use a specific port range to avoid conflicts with your local services:
*   **MySQL**: `33357` (5.7) -> `33390` (9.0)
*   **Postgres**: `54412` (v12) -> `54417` (v17)
*   **Mongo**: `27704` (v4) -> `27708` (v8)

---

## ⚠️ Troubleshooting

**"Connection Refused" in Tests?**
1.  Check if container is healthy: `docker ps`
2.  Did you use the correct mapped port? (e.g., `54412` not `5432`)
3.  Is `setup-dev-macos.sh` or Docker Desktop actually running?

**"Architecture Mismatch" (M1/M2 Mac)?**
Some older images (MySQL 5.7) need `platform: linux/amd64` in `docker-compose.test.yml`.
