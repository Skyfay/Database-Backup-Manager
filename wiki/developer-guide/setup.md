# Project Setup

Complete guide to setting up DBackup for development.

## Prerequisites

### Required

- **Node.js** 20 or higher
- **pnpm** (package manager)
- **Git**

### For Testing

- **Docker** and **Docker Compose**
- **Database CLI tools**:
  - `mysql` / `mysqldump` (MySQL/MariaDB)
  - `psql` / `pg_dump` (PostgreSQL)
  - `mongodump` / `mongorestore` (MongoDB)

### macOS Installation

```bash
# Install Node.js via Homebrew
brew install node

# Install pnpm
npm install -g pnpm

# Install database CLI tools
brew install mysql-client libpq mongodb-database-tools

# Add to PATH (add to ~/.zshrc)
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
```

### Ubuntu/Debian Installation

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install database CLI tools
sudo apt-get install mysql-client postgresql-client mongodb-database-tools
```

## Clone and Install

```bash
# Clone repository
git clone https://gitlab.com/Skyfay/dbackup.git
cd dbackup

# Install dependencies
pnpm install
```

## Environment Configuration

```bash
# Copy example configuration
cp .env.example .env
```

Edit `.env` with your settings:

```ini
# Database
DATABASE_URL="file:./data/database.db"

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="your-32-byte-hex-key"

# Authentication
BETTER_AUTH_SECRET="your-auth-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Optional: Timezone
TZ="Europe/Berlin"
```

### Generate Encryption Key

```bash
# macOS/Linux
openssl rand -hex 32
```

## Database Setup

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

## Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test Database Setup

For integration testing, start the test database containers:

```bash
# Start test databases
docker-compose -f docker-compose.test.yml up -d
```

This starts:
- **MySQL 8.0** on port 3306
- **PostgreSQL 15** on port 5432
- **MongoDB 6.0** on port 27017

### Test Database Credentials

| Database | Host | Port | User | Password |
| :--- | :--- | :--- | :--- | :--- |
| MySQL | localhost | 3306 | root | rootpassword |
| PostgreSQL | localhost | 5432 | testuser | testpassword |
| MongoDB | localhost | 27017 | - | - |

## Running Tests

```bash
# Run unit tests
pnpm test

# Run integration tests (requires test containers)
pnpm test:integration

# Seed test data for UI testing
pnpm test:ui
```

## Useful Commands

### Prisma

```bash
# Open database GUI
npx prisma studio

# Create migration
npx prisma migrate dev --name description

# Reset database
npx prisma migrate reset
```

### Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## IDE Setup

### VS Code

Recommended extensions:
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense

### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if containers are running
docker ps

# View container logs
docker logs dbackup-mysql-test
```

### CLI Tools Not Found

Ensure database CLI tools are in your PATH:

```bash
# Verify installation
which mysqldump
which pg_dump
which mongodump
```

## Next Steps

- [Architecture](/developer-guide/architecture) - Understand the system design
- [Service Layer](/developer-guide/core/services) - Learn about business logic
- [Adapter System](/developer-guide/core/adapters) - How to extend DBackup
