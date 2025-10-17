#!/bin/bash

###############################################################################
# Production Deployment Script
#
# Automates the complete production deployment process with:
# - Pre-flight checks (tests, lint, type-check, security audit)
# - Build process with validation
# - Firebase deployment (hosting + rules)
# - Post-deployment validation
# - Automated notifications
#
# Usage:
#   ./scripts/production-deploy.sh
#
# Requirements:
#   - Node.js v22+ and npm v10+
#   - Firebase CLI v14+
#   - Git (for version tagging)
#   - All tests passing
###############################################################################

set -e  # Exit on any error
set -o pipefail  # Exit on pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="sierra-painting-prod"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
DEPLOYMENT_START=$(date +%s)
DEPLOYMENT_VERSION=$(date +%Y%m%d-%H%M%S)

###############################################################################
# Utility Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

send_slack_notification() {
    if [ -n "$SLACK_WEBHOOK" ]; then
        local message="$1"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

prompt_confirmation() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        error "Deployment cancelled by user"
        exit 1
    fi
}

###############################################################################
# Pre-Flight Checks
###############################################################################

preflight_checks() {
    section "🔍 PRE-FLIGHT CHECKS"

    log "Checking required tools..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    success "Node.js $NODE_VERSION"

    # Check npm version
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    NPM_VERSION=$(npm --version)
    success "npm $NPM_VERSION"

    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        error "Firebase CLI is not installed"
        echo "Install with: npm install -g firebase-tools"
        exit 1
    fi
    FIREBASE_VERSION=$(firebase --version)
    success "Firebase CLI $FIREBASE_VERSION"

    # Check Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
        exit 1
    fi
    GIT_VERSION=$(git --version)
    success "$GIT_VERSION"

    # Check if we're on the main branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        warning "Not on main branch (current: $CURRENT_BRANCH)"
        prompt_confirmation "Deploy from $CURRENT_BRANCH branch?"
    else
        success "On main branch"
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        warning "You have uncommitted changes"
        git status --short
        prompt_confirmation "Deploy with uncommitted changes?"
    else
        success "No uncommitted changes"
    fi

    # Check Firebase login
    if ! firebase login:list &> /dev/null; then
        error "Not logged in to Firebase"
        echo "Run: firebase login"
        exit 1
    fi
    success "Logged in to Firebase"

    # Verify correct Firebase project
    log "Switching to production project..."
    firebase use production
    CURRENT_PROJECT=$(firebase use)
    if [[ ! $CURRENT_PROJECT =~ "sierra-painting-prod" ]]; then
        error "Wrong Firebase project: $CURRENT_PROJECT"
        exit 1
    fi
    success "Using $CURRENT_PROJECT"
}

###############################################################################
# Code Quality Checks
###############################################################################

run_quality_checks() {
    section "🧪 CODE QUALITY CHECKS"

    log "Installing dependencies..."
    npm ci --silent
    success "Dependencies installed"

    log "Running TypeScript type checking..."
    if npm run type-check; then
        success "Type checking passed"
    else
        error "Type checking failed"
        exit 1
    fi

    log "Running ESLint..."
    if npm run lint; then
        success "Linting passed"
    else
        error "Linting failed"
        exit 1
    fi

    log "Running unit tests..."
    if npm test -- --run; then
        success "All tests passed"
    else
        error "Tests failed"
        exit 1
    fi
}

###############################################################################
# Security Audit
###############################################################################

run_security_audit() {
    section "🔒 SECURITY AUDIT"

    log "Running npm audit..."
    set +e  # Don't exit on audit warnings
    AUDIT_OUTPUT=$(npm audit --production 2>&1)
    AUDIT_EXIT_CODE=$?
    set -e

    echo "$AUDIT_OUTPUT"

    # Check for critical/high vulnerabilities
    if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
        success "No vulnerabilities found"
    elif echo "$AUDIT_OUTPUT" | grep -E "critical|high" | grep -v "0 critical" | grep -v "0 high" &> /dev/null; then
        error "Critical or high severity vulnerabilities found"
        warning "Please fix vulnerabilities before deploying to production"
        prompt_confirmation "Deploy anyway? (NOT RECOMMENDED)"
    else
        warning "Some vulnerabilities found (low/moderate)"
        success "No critical/high vulnerabilities"
    fi
}

###############################################################################
# Build Application
###############################################################################

build_application() {
    section "🏗️  BUILDING APPLICATION"

    log "Cleaning previous build..."
    rm -rf dist
    success "Build directory cleaned"

    log "Building production bundle..."
    BUILD_START=$(date +%s)

    if npm run build; then
        BUILD_END=$(date +%s)
        BUILD_TIME=$((BUILD_END - BUILD_START))
        success "Build completed in ${BUILD_TIME}s"
    else
        error "Build failed"
        exit 1
    fi

    # Verify build output
    if [ ! -d "dist" ]; then
        error "Build directory not created"
        exit 1
    fi

    if [ ! -f "dist/index.html" ]; then
        error "index.html not found in build output"
        exit 1
    fi

    success "Build output verified"

    # Show bundle sizes
    log "Bundle sizes:"
    du -sh dist
    find dist -name "*.js" -exec du -h {} \; | sort -h | tail -10
}

###############################################################################
# Deploy to Staging First
###############################################################################

deploy_to_staging() {
    section "🧪 DEPLOYING TO STAGING"

    prompt_confirmation "Deploy to staging first for validation?"

    log "Switching to staging project..."
    firebase use staging

    log "Deploying to staging..."
    if firebase deploy --only hosting; then
        success "Deployed to staging"
    else
        error "Staging deployment failed"
        exit 1
    fi

    STAGING_URL="https://sierra-painting-staging.web.app"
    echo ""
    echo -e "${GREEN}Staging URL: $STAGING_URL${NC}"
    echo ""

    warning "Please verify the staging deployment:"
    echo "  1. Open: $STAGING_URL"
    echo "  2. Test login"
    echo "  3. Test core functionality (jobs, invoices)"
    echo "  4. Check browser console for errors"
    echo ""

    prompt_confirmation "Staging looks good?"

    log "Switching back to production..."
    firebase use production
    success "Ready for production deployment"
}

###############################################################################
# Deploy to Production
###############################################################################

deploy_to_production() {
    section "🚀 DEPLOYING TO PRODUCTION"

    warning "This will deploy to PRODUCTION: $PROJECT_NAME"
    echo ""
    echo "Deployment details:"
    echo "  • Version: $DEPLOYMENT_VERSION"
    echo "  • Branch: $CURRENT_BRANCH"
    echo "  • Commit: $(git rev-parse --short HEAD)"
    echo "  • Time: $(date)"
    echo ""

    prompt_confirmation "Proceed with production deployment?"

    # Send start notification
    send_slack_notification "🚀 Production deployment started by $(whoami)\nVersion: $DEPLOYMENT_VERSION"

    log "Deploying hosting..."
    if firebase deploy --only hosting; then
        success "Hosting deployed"
    else
        error "Hosting deployment failed"
        send_slack_notification "❌ Production deployment FAILED (hosting)"
        exit 1
    fi

    log "Deploying Firestore rules..."
    if firebase deploy --only firestore:rules; then
        success "Firestore rules deployed"
    else
        error "Firestore rules deployment failed"
        send_slack_notification "❌ Production deployment FAILED (firestore rules)"
        exit 1
    fi

    log "Deploying Firestore indexes..."
    if firebase deploy --only firestore:indexes; then
        success "Firestore indexes deployed"
    else
        warning "Firestore indexes deployment had issues (may be okay if no changes)"
    fi

    log "Deploying Storage rules..."
    if firebase deploy --only storage:rules; then
        success "Storage rules deployed"
    else
        error "Storage rules deployment failed"
        send_slack_notification "❌ Production deployment FAILED (storage rules)"
        exit 1
    fi

    success "All components deployed successfully"
}

###############################################################################
# Post-Deployment Validation
###############################################################################

post_deployment_validation() {
    section "✅ POST-DEPLOYMENT VALIDATION"

    PROD_URL="https://yourcompany.app"

    log "Waiting for deployment to propagate (10 seconds)..."
    sleep 10

    log "Testing site availability..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        success "Site is accessible (HTTP $HTTP_CODE)"
    else
        error "Site returned HTTP $HTTP_CODE"
        warning "Deployment may have issues!"
    fi

    log "Testing SPA routing..."
    JOBS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/jobs" || echo "000")
    if [ "$JOBS_CODE" == "200" ]; then
        success "SPA routing works (HTTP $JOBS_CODE)"
    else
        warning "SPA routing may have issues (HTTP $JOBS_CODE)"
    fi

    log "Checking for JavaScript errors..."
    if curl -s "$PROD_URL" | grep -q "assets/index"; then
        success "JavaScript bundles referenced"
    else
        warning "JavaScript bundles may not be loading correctly"
    fi

    echo ""
    warning "Manual validation required:"
    echo "  1. Open: $PROD_URL"
    echo "  2. Test authentication (login/logout)"
    echo "  3. Test core features (jobs, invoices)"
    echo "  4. Check Sentry for errors: https://sentry.io/..."
    echo "  5. Monitor for 15 minutes"
    echo ""
}

###############################################################################
# Tagging and Documentation
###############################################################################

tag_release() {
    section "🏷️  TAGGING RELEASE"

    TAG_NAME="v$DEPLOYMENT_VERSION"
    COMMIT_HASH=$(git rev-parse --short HEAD)

    log "Creating git tag: $TAG_NAME"

    git tag -a "$TAG_NAME" -m "Production deployment $DEPLOYMENT_VERSION

Deployed: $(date)
Commit: $COMMIT_HASH
Deployed by: $(whoami)

Deployment automated via scripts/production-deploy.sh"

    log "Pushing tag to remote..."
    if git push origin "$TAG_NAME"; then
        success "Tag pushed: $TAG_NAME"
    else
        warning "Failed to push tag (not critical)"
    fi
}

###############################################################################
# Completion
###############################################################################

deployment_complete() {
    section "🎉 DEPLOYMENT COMPLETE"

    DEPLOYMENT_END=$(date +%s)
    DEPLOYMENT_TIME=$((DEPLOYMENT_END - DEPLOYMENT_START))
    DEPLOYMENT_MINUTES=$((DEPLOYMENT_TIME / 60))

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  DEPLOYMENT SUCCESSFUL                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Version: $DEPLOYMENT_VERSION"
    echo "  Duration: ${DEPLOYMENT_MINUTES}m ${DEPLOYMENT_TIME}s"
    echo "  Commit: $(git rev-parse --short HEAD)"
    echo ""
    echo "  Production URL: https://yourcompany.app"
    echo "  Firebase Console: https://console.firebase.google.com/project/$PROJECT_NAME"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Monitor Sentry for errors (15+ minutes)"
    echo "  2. Check Firebase Analytics for traffic"
    echo "  3. Test critical user flows"
    echo "  4. Update team in #production-alerts"
    echo ""

    # Send success notification
    send_slack_notification "✅ Production deployment completed successfully
Version: $DEPLOYMENT_VERSION
Duration: ${DEPLOYMENT_MINUTES}m ${DEPLOYMENT_TIME}s
URL: https://yourcompany.app
Deployed by: $(whoami)"
}

###############################################################################
# Error Handler
###############################################################################

error_handler() {
    local exit_code=$?
    local line_number=$1

    section "❌ DEPLOYMENT FAILED"

    error "Deployment failed at line $line_number with exit code $exit_code"

    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check error messages above"
    echo "  2. Verify all pre-flight checks passed"
    echo "  3. Check Firebase project configuration"
    echo "  4. Review recent code changes"
    echo ""
    echo "Rollback if needed:"
    echo "  firebase hosting:rollback"
    echo ""

    # Send failure notification
    send_slack_notification "❌ Production deployment FAILED
Exit code: $exit_code
Line: $line_number
Deployed by: $(whoami)
Action: Check logs and consider rollback"

    exit $exit_code
}

# Set error trap
trap 'error_handler $LINENO' ERR

###############################################################################
# Main Execution
###############################################################################

main() {
    clear

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         SIERRA PAINTING - PRODUCTION DEPLOYMENT            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Version: $DEPLOYMENT_VERSION"
    echo "  Time: $(date)"
    echo "  User: $(whoami)"
    echo ""

    # Execute deployment stages
    preflight_checks
    run_quality_checks
    run_security_audit
    build_application

    # Optional: Deploy to staging first
    if [[ "${SKIP_STAGING:-false}" != "true" ]]; then
        deploy_to_staging
    else
        warning "Skipping staging deployment (SKIP_STAGING=true)"
    fi

    deploy_to_production
    post_deployment_validation
    tag_release
    deployment_complete
}

# Run main function
main
