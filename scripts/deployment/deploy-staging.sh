#!/bin/bash

################################################################################
# Sierra Painting - Staging Deployment Script
# 
# Implements complete pre-flight checks, quality gates, and deployment
# matching the Phase 6 requirements from the roadmap.
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG_NAME="v${VERSION}-staging"
FIREBASE_PROJECT="staging"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Sierra Painting - Staging Deployment${NC}"
echo -e "${BLUE}  Version: ${VERSION}${NC}"
echo -e "${BLUE}  Time: ${TIMESTAMP}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Step 1: Pre-flight checks
echo -e "${YELLOW}🔍 Running pre-flight checks...${NC}"

# Check git status
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}✗ Error: Working directory is not clean${NC}"
  echo -e "${YELLOW}  Please commit or stash your changes before deploying${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git working directory is clean${NC}"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "develop" ]]; then
  echo -e "${YELLOW}⚠ Warning: Deploying from branch '${CURRENT_BRANCH}'${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 2: Quality gates
echo -e "\n${YELLOW}🎯 Running quality gates...${NC}"

# Test coverage
echo -e "${BLUE}  Running tests...${NC}"
npm run test:all || {
  echo -e "${RED}✗ Tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ All tests passing${NC}"

# Coverage check
npm run coverage:check || {
  echo -e "${RED}✗ Coverage below threshold${NC}"
  exit 1
}
echo -e "${GREEN}✓ Coverage meets requirements (75%+)${NC}"

# Linting
echo -e "${BLUE}  Running linter...${NC}"
npm run lint || {
  echo -e "${RED}✗ Linting errors found${NC}"
  exit 1
}
echo -e "${GREEN}✓ No linting errors${NC}"

# Type checking
echo -e "${BLUE}  Running type check...${NC}"
npm run type-check || {
  echo -e "${RED}✗ Type errors found${NC}"
  exit 1
}
echo -e "${GREEN}✓ No type errors${NC}"

# Security scan
echo -e "${BLUE}  Running security scan...${NC}"
npm run security:scan || {
  echo -e "${RED}✗ Security vulnerabilities found${NC}"
  exit 1
}
echo -e "${GREEN}✓ No security issues${NC}"

# Accessibility check
echo -e "${BLUE}  Running accessibility checks...${NC}"
npm run a11y:check || {
  echo -e "${RED}✗ Accessibility violations found${NC}"
  exit 1
}
echo -e "${GREEN}✓ Accessibility compliance verified${NC}"

# Step 3: Build
echo -e "\n${YELLOW}🔨 Building production bundle...${NC}"
npm run build || {
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Build completed successfully${NC}"

# Step 4: Size check
echo -e "\n${YELLOW}📊 Checking bundle sizes...${NC}"
npm run size:check || {
  echo -e "${RED}✗ Bundle size exceeds limits${NC}"
  exit 1
}
echo -e "${GREEN}✓ Bundle sizes within limits${NC}"

# Step 5: Create git tag
echo -e "\n${YELLOW}🏷  Creating release tag...${NC}"
git tag -a "${TAG_NAME}" -m "Staging release ${VERSION} - ${TIMESTAMP}"
echo -e "${GREEN}✓ Created tag: ${TAG_NAME}${NC}"

# Step 6: Push tag
git push origin "${TAG_NAME}"
echo -e "${GREEN}✓ Pushed tag to remote${NC}"

# Step 7: Deploy to Firebase
echo -e "\n${YELLOW}🚀 Deploying to Firebase Staging...${NC}"

# Set Firebase project
firebase use staging || {
  echo -e "${RED}✗ Failed to set Firebase project${NC}"
  exit 1
}

# Deploy hosting, firestore rules, and functions
firebase deploy --only hosting,firestore:rules,functions || {
  echo -e "${RED}✗ Firebase deployment failed${NC}"
  echo -e "${YELLOW}Rolling back...${NC}"
  # Rollback tag
  git tag -d "${TAG_NAME}"
  git push origin ":refs/tags/${TAG_NAME}"
  exit 1
}

echo -e "${GREEN}✓ Firebase deployment successful${NC}"

# Step 8: Run smoke tests
echo -e "\n${YELLOW}🧪 Running smoke tests against staging...${NC}"
npm run smoke:staging || {
  echo -e "${RED}⚠ Smoke tests failed - manual verification required${NC}"
}

# Step 9: Deployment summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Version: ${VERSION}${NC}"
echo -e "${GREEN}  Tag: ${TAG_NAME}${NC}"
echo -e "${GREEN}  Environment: Staging${NC}"
echo -e "${GREEN}  Staging URL: https://staging.sierra-painting.com${NC}"
echo -e "${GREEN}  Firebase Console: https://console.firebase.google.com/project/sierra-painting-staging${NC}"
echo -e "${GREEN}  Sentry: https://sentry.io/organizations/sierra/projects/staging${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Step 10: Post-deployment monitoring
echo -e "${YELLOW}📈 Monitor deployment at:${NC}"
echo -e "  • Sentry: https://sentry.io/organizations/sierra/projects/staging"
echo -e "  • Firebase Console: https://console.firebase.google.com"
echo -e "  • Web Vitals: Check RUM data in 10-15 minutes\n"

echo -e "${GREEN}🎉 Deployment successful! Time to celebrate!${NC}\n"
