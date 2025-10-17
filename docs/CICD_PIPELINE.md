# CI/CD Pipeline Documentation

Complete guide for the automated GitHub Actions CI/CD pipeline for Sierra Painting React application.

## Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [CI Pipeline](#ci-pipeline)
- [Deployment Pipelines](#deployment-pipelines)
- [Required Secrets](#required-secrets)
- [Setup Guide](#setup-guide)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The CI/CD pipeline provides:

- ✅ **Automated Testing**: Unit, integration, and Firebase Rules tests
- ✅ **Code Quality**: Linting, type checking, formatting
- ✅ **Security Scanning**: npm audit, Snyk vulnerability scanning
- ✅ **Performance**: Lighthouse CI with budgets
- ✅ **Automated Deployment**: Staging and production deployments
- ✅ **Observability**: Sentry release tracking and source maps
- ✅ **Validation**: Post-deployment checks

## Pipeline Architecture

### Three Main Workflows

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Runs on every PR and push to main/develop
   - Quality, security, testing, build, performance checks

2. **Staging Deployment** (`.github/workflows/deploy-staging.yml`)
   - Auto-deploys on push to `develop` branch
   - Fast deployment with basic quality checks

3. **Production Deployment** (`.github/workflows/deploy-production.yml`)
   - Deploys on push to `main` branch or version tags
   - Comprehensive pre-deployment checks
   - Manual approval via GitHub environments
   - Post-deployment validation

## CI Pipeline

### Workflow File

`.github/workflows/ci.yml`

### Trigger Events

```yaml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
```

### Jobs

#### 1. Code Quality

**Duration**: ~3-5 minutes

**Steps**:
- Checkout code
- Setup Node.js with caching
- Install dependencies
- Run ESLint
- Run TypeScript type check
- Run Prettier formatter check

**Quality Gates**:
- Zero ESLint errors
- Zero TypeScript errors
- All files properly formatted

#### 2. Security Scan

**Duration**: ~3-5 minutes

**Steps**:
- npm audit (moderate+ vulnerabilities)
- Snyk vulnerability scanning (high+ severity)

**Quality Gates**:
- No moderate+ npm vulnerabilities
- No high+ Snyk vulnerabilities

#### 3. Unit Tests

**Duration**: ~5-10 minutes

**Steps**:
- Run unit tests with coverage
- Upload coverage to Codecov
- Archive coverage artifacts

**Quality Gates**:
- All tests passing
- 80%+ code coverage

#### 4. Firebase Emulator Tests

**Duration**: ~10-15 minutes

**Steps**:
- Setup Java 17 for Firebase Emulators
- Cache emulators
- Start emulators (Auth, Firestore, Storage)
- Verify emulators running
- Run emulator integration tests
- Run Firestore Rules tests
- Check Rules coverage (90%+ required)
- Stop emulators

**Quality Gates**:
- All emulator tests passing
- All rules tests passing
- 90%+ rules coverage

#### 5. Build

**Duration**: ~5-10 minutes

**Depends On**: Quality, Unit Tests, Emulator Tests

**Steps**:
- Build production bundle
- Check bundle size (< 5MB)
- Archive build artifacts

**Quality Gates**:
- Build succeeds
- Bundle size < 5MB

#### 6. Lighthouse CI

**Duration**: ~5-8 minutes

**Depends On**: Build

**Steps**:
- Download build artifacts
- Run Lighthouse CI (3 runs)
- Upload results

**Quality Gates**:
- Performance score ≥ 90
- Accessibility ≥ 90
- Best Practices ≥ 90
- SEO ≥ 90
- FCP < 2s
- LCP < 2.5s
- CLS < 0.1
- TBT < 300ms

### Total CI Duration

**Parallel execution**: ~15-20 minutes

## Deployment Pipelines

### Staging Deployment

**File**: `.github/workflows/deploy-staging.yml`

**Trigger**: Push to `develop` branch

**Duration**: ~10-15 minutes

**Steps**:
1. Quality checks (lint, type-check)
2. Run unit tests
3. Build for staging
4. Deploy to Firebase Hosting
5. Deploy Firestore Rules
6. Upload source maps to Sentry
7. Create Sentry release

**Environment**: `staging`
- URL: https://sierra-painting-staging.web.app
- Automatic deployment (no approval)

### Production Deployment

**File**: `.github/workflows/deploy-production.yml`

**Trigger**:
- Push to `main` branch
- Version tags (`v*.*.*`)
- Manual workflow dispatch

**Duration**: ~30-40 minutes

**Three-Stage Process**:

#### Stage 1: Pre-Deployment Checks (~20 minutes)

**Full test suite including**:
- Linter, type check
- Unit tests with coverage
- Firebase Emulator tests
- Firestore Rules tests (90%+ coverage)
- Upload coverage to Codecov

**Quality Gates**:
- All tests passing
- 90%+ rules coverage
- Coverage uploaded

#### Stage 2: Production Deployment (~10-15 minutes)

**Depends on**: Pre-deployment checks passing

**Steps**:
1. Extract version (from tag or commit SHA)
2. Build for production
3. Check bundle size (< 5MB)
4. Create Firestore backup
5. Deploy to Firebase Hosting
6. Deploy Firestore Rules
7. Upload source maps to Sentry
8. Create Sentry release
9. Create GitHub Release (if version tag)

**Environment**: `production`
- URL: https://sierra-painting.web.app
- **Requires manual approval** (via GitHub environment protection)

#### Stage 3: Post-Deployment Validation (~2-3 minutes)

**Depends on**: Deployment success

**Steps**:
1. Check production URL (HTTP 200)
2. Verify critical pages load
3. Notify success/failure

**Quality Gates**:
- Production site accessible
- Login page accessible
- All critical pages return 200

## Required Secrets

### GitHub Repository Secrets

Configure these in: **Settings → Secrets and variables → Actions**

#### Firebase Secrets

**Staging**:
```
STAGING_FIREBASE_API_KEY
STAGING_FIREBASE_AUTH_DOMAIN
STAGING_FIREBASE_PROJECT_ID
STAGING_FIREBASE_STORAGE_BUCKET
STAGING_FIREBASE_MESSAGING_SENDER_ID
STAGING_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_STAGING
```

**Production**:
```
PROD_FIREBASE_API_KEY
PROD_FIREBASE_AUTH_DOMAIN
PROD_FIREBASE_PROJECT_ID
PROD_FIREBASE_STORAGE_BUCKET
PROD_FIREBASE_MESSAGING_SENDER_ID
PROD_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_PROD
```

**Common**:
```
FIREBASE_TOKEN
```

#### Sentry Secrets

```
STAGING_SENTRY_DSN
PRODUCTION_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

#### Testing Secrets

```
CODECOV_TOKEN
SNYK_TOKEN (optional)
```

### GitHub Environment Secrets

Configure in: **Settings → Environments**

#### Staging Environment

- **Name**: `staging`
- **Deployment branches**: `develop`
- **Protection rules**: None (auto-deploy)

#### Production Environment

- **Name**: `production`
- **Deployment branches**: `main`, tags matching `v*`
- **Protection rules**:
  - ✅ Required reviewers (recommended: 1-2 people)
  - ✅ Wait timer (optional: 5 minutes)

## Setup Guide

### 1. Firebase Setup

#### Create Service Accounts

**For Staging**:
```bash
# Go to Firebase Console → Project Settings → Service Accounts
# Click "Generate New Private Key"
# Save as JSON, copy entire contents to FIREBASE_SERVICE_ACCOUNT_STAGING
```

**For Production**:
```bash
# Same process as staging
# Copy to FIREBASE_SERVICE_ACCOUNT_PROD
```

#### Generate Firebase CI Token

```bash
firebase login:ci
# Copy the token to FIREBASE_TOKEN secret
```

### 2. Sentry Setup

#### Create Auth Token

1. Go to Sentry → Settings → Auth Tokens
2. Create token with scopes:
   - `project:releases`
   - `project:write`
   - `org:read`
3. Copy to `SENTRY_AUTH_TOKEN`

#### Get DSN

1. Go to project settings
2. Copy DSN for staging project → `STAGING_SENTRY_DSN`
3. Copy DSN for production project → `PRODUCTION_SENTRY_DSN`

#### Set Organization/Project

```bash
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### 3. Codecov Setup

1. Go to [codecov.io](https://codecov.io)
2. Add your repository
3. Copy upload token to `CODECOV_TOKEN`

### 4. Snyk Setup (Optional)

1. Go to [snyk.io](https://snyk.io)
2. Create account and integrate with GitHub
3. Copy API token to `SNYK_TOKEN`

### 5. GitHub Environments

#### Create Staging Environment

```yaml
Settings → Environments → New environment
Name: staging
Deployment branches: develop
```

#### Create Production Environment

```yaml
Settings → Environments → New environment
Name: production
Deployment branches: main, v*
Protection rules:
  - Required reviewers: your-username, other-approvers
  - Wait timer: 0 minutes (or as desired)
```

### 6. Verify Setup

#### Test CI Pipeline

```bash
# Create a test PR
git checkout -b test/ci-pipeline
git push origin test/ci-pipeline

# Open PR and watch GitHub Actions
```

#### Test Staging Deployment

```bash
# Push to develop
git checkout develop
git merge test/ci-pipeline
git push origin develop

# Check Actions tab
```

#### Test Production Deployment

```bash
# Push to main (will require approval)
git checkout main
git merge develop
git push origin main

# Go to Actions → Environments → production
# Approve deployment
```

## Troubleshooting

### CI Pipeline Issues

#### Tests Failing

**Check logs**:
```
Actions → Failed workflow → Click job → Expand failing step
```

**Common issues**:
- Flaky tests: Re-run workflow
- Missing dependencies: Check package.json
- Type errors: Run `npm run type-check` locally

#### Emulator Tests Failing

**Common issues**:
- Emulators not starting: Check Java installation
- Port conflicts: Emulators use different ports in CI
- Timeout: Increase sleep time in workflow

**Debug**:
```bash
# Run locally
npm run emulators:start
npm run test:emulator
```

#### Build Failing

**Common issues**:
- Bundle size exceeded: Check bundle analyzer
- Environment variables missing: Check secrets
- TypeScript errors: Run `npm run type-check`

### Deployment Issues

#### Staging Deployment Failing

**Check**:
1. Firebase service account permissions
2. Hosting site exists
3. Project ID matches

**Debug**:
```bash
# Test locally
npm run build
firebase deploy --only hosting --project staging-project-id
```

#### Production Deployment Stuck

**Common causes**:
- Waiting for approval (check Environments)
- Pre-deployment checks failing
- Firebase permissions issue

**Manual deployment**:
```bash
# If pipeline is broken
npm run build
firebase deploy --project production-project-id
```

#### Source Maps Not Uploading

**Check**:
1. `SENTRY_AUTH_TOKEN` is set
2. Token has correct permissions
3. Organization/project slugs are correct

**Debug**:
```bash
# Test Sentry CLI locally
export SENTRY_AUTH_TOKEN=your-token
npx @sentry/cli releases list
```

### Performance Issues

#### Lighthouse Failing

**Common issues**:
- Performance < 90: Check bundle size, lazy loading
- Accessibility < 90: Run Lighthouse locally, fix issues
- LCP > 2.5s: Optimize images, fonts

**Debug**:
```bash
npm run build
npm run preview
# Open Lighthouse in Chrome DevTools
```

## Best Practices

### 1. Branch Strategy

**Recommended flow**:
```
feature → develop → main
  ↓         ↓        ↓
 none    staging   production
```

**Workflow**:
1. Create feature branch from `develop`
2. Open PR to `develop` (CI runs)
3. Merge to `develop` (deploys to staging)
4. Test in staging
5. Merge `develop` to `main` (deploys to production with approval)

### 2. Semantic Versioning

**Use version tags**:
```bash
# Create version tag
git tag v1.2.0
git push origin v1.2.0

# Triggers production deployment with proper version
```

**Version format**: `v{major}.{minor}.{patch}`
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes

### 3. Commit Messages

**Use conventional commits**:
```
feat: add user authentication
fix: resolve invoice calculation bug
chore: update dependencies
docs: improve CI/CD documentation
test: add emulator tests for jobs
```

### 4. Pull Request Workflow

**Before merging**:
- ✅ All CI checks passing
- ✅ Code reviewed by 1+ person
- ✅ Tests added for new features
- ✅ Documentation updated

### 5. Monitoring Deployments

**After staging deployment**:
1. Check Sentry for errors
2. Test critical user flows
3. Review performance in Firebase

**After production deployment**:
1. Monitor Sentry for 30 minutes
2. Check Firebase Analytics
3. Verify no error spikes

### 6. Rollback Strategy

**If production has issues**:

**Option 1: Revert commit**
```bash
git revert HEAD
git push origin main
# CI/CD will deploy previous version
```

**Option 2: Deploy previous release**
```bash
# Find last good version
git tag -l

# Deploy specific version
git checkout v1.1.0
# Manual deploy or push tag
```

**Option 3: Firestore rollback**
```bash
# If Firestore backup was created
firebase firestore:import backup-YYYYMMDD-HHMMSS
```

### 7. Cost Optimization

**Reduce CI minutes**:
- Use job dependencies (`needs:`)
- Cache dependencies aggressively
- Skip CI on docs-only changes

**Example**:
```yaml
on:
  push:
    paths-ignore:
      - 'docs/**'
      - '**.md'
```

## Workflow Enhancements

### Adding E2E Tests (Future)

```yaml
# In production deployment
- name: Run E2E smoke tests
  run: npm run test:e2e:smoke
  env:
    PLAYWRIGHT_BASE_URL: https://sierra-painting.web.app
```

### Adding Preview Channels

```yaml
# For pull requests
- name: Deploy preview channel
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    repoToken: ${{ secrets.GITHUB_TOKEN }}
    firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    expires: 7d
```

### Adding Slack Notifications

```yaml
- name: Notify deployment
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Metrics and SLAs

### Pipeline Performance

**Target CI duration**: < 20 minutes
**Target deployment**: < 15 minutes (staging), < 40 minutes (production)

### Success Rates

**Target success rate**: > 95%
**Max build queue time**: < 5 minutes

### Quality Gates

**Code coverage**: > 80%
**Rules coverage**: > 90%
**Performance score**: > 90
**Bundle size**: < 5MB

## Support

### Pipeline Issues

**Check status**:
- [GitHub Status](https://www.githubstatus.com/)
- [Firebase Status](https://status.firebase.google.com/)
- [Sentry Status](https://status.sentry.io/)

### Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase Hosting CI/CD](https://firebase.google.com/docs/hosting/github-integration)
- [Sentry Release Tracking](https://docs.sentry.io/product/releases/)

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0
**Maintained By**: Development Team
