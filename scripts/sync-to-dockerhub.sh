#!/bin/bash
# =============================================================================
# Sync Docker Images from GitLab Registry to Docker Hub
# =============================================================================
# Prerequisites:
#   brew install skopeo
#
# Usage:
#   ./scripts/sync-to-dockerhub.sh
#
# Environment variables (optional):
#   DOCKERHUB_REPO - Target repo (default: skyfay/dbackup)
# =============================================================================

set -e

# Configuration
GITLAB_REGISTRY="registry.gitlab.com/skyfay/dbackup"
DOCKERHUB_REPO="${DOCKERHUB_REPO:-skyfay/dbackup}"

# All tags to sync (add new versions here)
TAGS=(
    # Beta releases
    "v0.9.2-beta"
    "v0.9.1-beta"
    "v0.9.0-beta"
    "v0.8.3-beta"
    "v0.8.2-beta"
    "v0.8.1-beta"
    "v0.8.0-beta"
    # Floating tags
    "beta"
    # Add "latest" when you have a stable release
    # "latest"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       DBackup - GitLab to Docker Hub Sync                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for skopeo
if ! command -v skopeo &> /dev/null; then
    echo -e "${RED}❌ skopeo is not installed${NC}"
    echo "   Install with: brew install skopeo"
    exit 1
fi

# Login to registries
echo -e "${YELLOW}🔐 Logging into registries...${NC}"
echo ""

echo "   GitLab Registry:"
if ! skopeo login registry.gitlab.com; then
    echo -e "${RED}❌ GitLab login failed${NC}"
    exit 1
fi
echo ""

echo "   Docker Hub:"
if ! skopeo login docker.io; then
    echo -e "${RED}❌ Docker Hub login failed${NC}"
    exit 1
fi
echo ""

# Sync each tag
echo -e "${YELLOW}📦 Starting sync...${NC}"
echo "   Source: ${GITLAB_REGISTRY}"
echo "   Target: ${DOCKERHUB_REPO}"
echo ""

SUCCESS=0
FAILED=0

for TAG in "${TAGS[@]}"; do
    echo -e "${BLUE}→ Syncing ${TAG}...${NC}"

    if skopeo copy --all \
        "docker://${GITLAB_REGISTRY}:${TAG}" \
        "docker://docker.io/${DOCKERHUB_REPO}:${TAG}" 2>/dev/null; then
        echo -e "  ${GREEN}✓ ${TAG} synced successfully${NC}"
        ((SUCCESS++))
    else
        echo -e "  ${RED}✗ ${TAG} failed (may not exist)${NC}"
        ((FAILED++))
    fi
done

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Synced: ${SUCCESS}${NC}  ${RED}✗ Failed: ${FAILED}${NC}"
echo ""
echo -e "Docker Hub: ${YELLOW}https://hub.docker.com/r/${DOCKERHUB_REPO}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
