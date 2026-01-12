#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Database Backup Manager development setup for macOS...${NC}"

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${RED}Homebrew is not installed. Please install it first: https://brew.sh/${NC}"
    exit 1
fi

echo -e "${GREEN}Updating Homebrew...${NC}"
brew update

echo -e "${GREEN}Installing MySQL Client (mysqldump, mysqladmin)...${NC}"
brew install mysql-client

echo -e "${GREEN}Installing PostgreSQL Client (pg_dump, psql)...${NC}"
brew install libpq

echo -e "${GREEN}Installing MongoDB Database Tools (mongodump, mongorestore)...${NC}"
brew tap mongodb/brew
brew install mongodb-database-tools
brew install mongosh

echo -e "${GREEN}Installing generally useful tools (zip)...${NC}"
brew install zip

echo -e "${YELLOW}----------------------------------------------------------------${NC}"
echo -e "${RED}IMPORTANT ACTION REQUIRED:${NC}"
echo -e "${YELLOW}Homebrew does not link mysql-client and libpq to your system path by default.${NC}"
echo -e "${YELLOW}To make the commands available to VS Code and the terminal, run this:${NC}"
echo ""
echo 'export PATH="/opt/homebrew/opt/mysql-client/bin:/opt/homebrew/opt/libpq/bin:$PATH"'
echo ""
echo -e "${YELLOW}You should also add that line to your ~/.zshrc file to make it permanent:${NC}"
echo 'echo '\''export PATH="/opt/homebrew/opt/mysql-client/bin:/opt/homebrew/opt/libpq/bin:$PATH"'\'' >> ~/.zshrc'
echo 'source ~/.zshrc'
echo -e "${YELLOW}----------------------------------------------------------------${NC}"
