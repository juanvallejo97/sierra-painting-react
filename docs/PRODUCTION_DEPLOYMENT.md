# Production Deployment Guide

**Date**: 2025-10-17
**Status**: ✅ Ready for Production
**Version**: 1.0.0

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Validation](#post-deployment-validation)
6. [Monitoring Setup](#monitoring-setup)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Access

- [x] Firebase account with billing enabled
- [x] Sentry account (for error tracking)
- [x] GitHub repository access
- [x] Domain registrar access (for DNS)
- [x] Google Cloud Platform access (for reCAPTCHA)

### Required Tools

```bash
# Verify installations
node --version    # v22.20.0 or higher
npm --version     # v10.0.0 or higher
firebase --version # v14.0.0 or higher
git --version     # v2.40.0 or higher
```

### Required Knowledge

- Firebase Hosting & Firestore
- GitHub Actions & Secrets
- DNS & SSL configuration
- Environment variables management

---

## Environment Setup

### 1. Firebase Projects

Create **TWO** Firebase projects:

#### Staging Project
```bash
# Already created: sierra-painting-staging
firebase use staging
```

#### Production Project
```bash
# Create new production project
firebase projects:create sierra-painting-prod
firebase use production
firebase init hosting
firebase init firestore
```

### 2. Environment Variables

#### Production Environment Variables

Create `.env.production`:

```bash
# Firebase Configuration (from Firebase Console > Project Settings)
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=sierra-painting-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sierra-painting-prod
VITE_FIREBASE_STORAGE_BUCKET=sierra-painting-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry (from Sentry.io)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_ORG=your-org-slug
VITE_SENTRY_PROJECT=sierra-painting-prod
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# App Check (from Google Cloud Console > reCAPTCHA)
VITE_RECAPTCHA_SITE_KEY=6Le...your-production-site-key

# Analytics
VITE_ANALYTICS_ENABLED=true

# Application
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

#### GitHub Secrets

Add these secrets to GitHub repository:

```bash
# Navigate to: Settings > Secrets and variables > Actions > New repository secret

FIREBASE_SERVICE_ACCOUNT_STAGING    # From Firebase Console
FIREBASE_SERVICE_ACCOUNT_PROD       # From Firebase Console
SENTRY_AUTH_TOKEN                   # From Sentry.io
SLACK_WEBHOOK_URL                   # Optional: for notifications
```

### 3. Firebase Configuration

#### Enable Services

```bash
# Authentication
firebase use production
# Go to Firebase Console > Authentication > Sign-in method
# Enable: Email/Password

# Firestore
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# Storage
firebase deploy --only storage:rules

# Hosting
firebase deploy --only hosting
```

#### Security Rules

```bash
# Deploy security rules
npm run firebase:deploy:rules

# Verify rules deployed
firebase firestore:rules:list
```

### 4. DNS Configuration

#### Custom Domain Setup

1. **Purchase/Configure Domain**
   - Recommended: `app.yourcompany.com`
   - Alternative: `yourcompany.app`

2. **Add to Firebase Hosting**
   ```bash
   firebase hosting:channel:deploy production
   ```

3. **Configure DNS Records**

   Add these records at your DNS provider:

   ```
   Type: A
   Name: @
   Value: 151.101.1.195, 151.101.65.195
   TTL: 3600

   Type: A
   Name: www
   Value: 151.101.1.195, 151.101.65.195
   TTL: 3600

   Type: TXT
   Name: @
   Value: [Verification token from Firebase]
   TTL: 3600
   ```

4. **Wait for DNS Propagation** (up to 48 hours)

   Check status:
   ```bash
   dig +short yourcompany.app
   nslookup yourcompany.app
   ```

### 5. SSL Certificate

Firebase Hosting automatically provisions SSL certificates.

Verify:
- Go to Firebase Console > Hosting
- Check "Connected" status
- Certificate should show "Active"

---

## Pre-Deployment Checklist

### Code Quality ✅

```bash
# 1. Type checking
npm run type-check
# Expected: 0 errors

# 2. Linting
npm run lint
# Expected: 0 errors (warnings OK if documented)

# 3. Formatting
npm run format:check
# Expected: All files formatted

# 4. Unit tests
npm test -- --run
# Expected: All tests passing

# 5. Build test
npm run build
# Expected: Successful build
```

### Security Audit ✅

```bash
# 1. Dependency audit
npm audit --production
# Expected: 0 high/critical vulnerabilities

# 2. Firestore rules test
npm run test:rules
# Expected: All security tests passing

# 3. Environment variables check
grep -r "VITE_" .env.production
# Verify: No secrets, all values correct

# 4. App Check verification
# Verify: reCAPTCHA site key configured
# Verify: Debug tokens removed from production
```

### Performance Benchmarks ✅

```bash
# 1. Bundle size
npm run build:analyze
# Target: Total bundle < 3MB gzipped

# 2. Lighthouse audit
npm run build
npx lighthouse http://localhost:5173 --view
# Targets:
#   Performance: > 95
#   Accessibility: > 95
#   Best Practices: > 95
#   SEO: > 90

# 3. Load time test
# Use WebPageTest or similar
# Target: First Contentful Paint < 1.5s
```

### Database & Storage ✅

```bash
# 1. Firestore indexes
firebase firestore:indexes
# Verify: All required indexes created

# 2. Storage rules
firebase storage:rules:get
# Verify: Rules allow only authenticated uploads

# 3. Backup verification
# Verify: Automated backups configured
# Go to: GCP Console > Firestore > Backups
```

### Monitoring Setup ✅

```bash
# 1. Sentry configured
# Verify: DSN in .env.production
# Verify: Source maps upload configured

# 2. Firebase Analytics
# Verify: measurementId in .env.production

# 3. Uptime monitoring
# Setup: UptimeRobot or Pingdom
# Target: Check every 5 minutes

# 4. Error alerting
# Verify: Sentry alerts to Slack/Email
```

---

## Deployment Process

### Automated Deployment (Recommended)

#### Via GitHub Actions

1. **Merge to Main Branch**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **Workflow Triggers Automatically**
   - Runs all tests
   - Builds production bundle
   - Runs Lighthouse audit
   - Deploys to Firebase Hosting
   - Sends Slack notification

3. **Monitor Workflow**
   ```
   GitHub > Actions > "Deploy to Production"
   ```

#### Via Deploy Script

```bash
# Run automated deployment script
./scripts/production-deploy.sh

# The script will:
# 1. Run pre-flight checks
# 2. Build production bundle
# 3. Deploy to Firebase
# 4. Run post-deployment validation
# 5. Send notifications
```

### Manual Deployment (Emergency Only)

```bash
# 1. Switch to production project
firebase use production

# 2. Build production bundle
npm run build

# 3. Deploy
firebase deploy --only hosting

# 4. Deploy rules (if changed)
firebase deploy --only firestore:rules,storage:rules

# 5. Verify deployment
curl https://yourcompany.app
```

---

## Post-Deployment Validation

### Health Checks (Run in Order)

#### 1. Application Loads

```bash
# Check homepage
curl -I https://yourcompany.app
# Expected: HTTP/2 200

# Check SPA routing
curl -I https://yourcompany.app/jobs
# Expected: HTTP/2 200 (serves index.html)
```

#### 2. Authentication Works

```bash
# Manual test:
# 1. Go to https://yourcompany.app
# 2. Click "Sign In"
# 3. Enter test credentials
# 4. Verify successful login
```

#### 3. Firestore Connection

```bash
# Manual test:
# 1. Login to app
# 2. Navigate to Jobs page
# 3. Verify jobs load
# 4. Create new job
# 5. Verify job appears
```

#### 4. Analytics Tracking

```bash
# 1. Open browser DevTools > Network
# 2. Navigate through app
# 3. Look for requests to:
#    - google-analytics.com
#    - firebaselogging.googleapis.com

# 4. Verify in Firebase Console
# Analytics > Events (may take 24-48h for data)
```

#### 5. Error Tracking

```bash
# 1. Trigger test error
# Open browser console:
throw new Error('Test error for Sentry');

# 2. Check Sentry dashboard
# Should appear within 1 minute
```

#### 6. App Check Validation

```bash
# Manual test:
# 1. Open DevTools > Network
# 2. Make Firestore request
# 3. Check request headers
# Expected: X-Firebase-AppCheck: [token]
```

### Smoke Tests

Run E2E smoke tests:

```bash
# Against production
PLAYWRIGHT_BASE_URL=https://yourcompany.app npm run test:e2e:smoke

# Expected: All critical flows passing
# - Login
# - Create job
# - Create invoice
# - User management
```

---

## Monitoring Setup

### 1. Sentry (Error Tracking)

**Dashboard**: https://sentry.io/organizations/[org]/projects/sierra-painting-prod/

**Alerts to Configure**:
- Error rate > 5% (1 hour window)
- New error types (immediate)
- Performance degradation > 20% (1 hour)

**Integration**:
```bash
# Slack integration
# Sentry > Settings > Integrations > Slack
# Configure: #alerts channel
```

### 2. Firebase Analytics

**Dashboard**: Firebase Console > Analytics

**Key Metrics to Monitor**:
- Daily Active Users (DAU)
- Session duration
- Crash-free rate
- Screen views

**Custom Events**:
- job_created
- invoice_paid
- user_signup
- error (custom)

### 3. Uptime Monitoring

**Recommended**: UptimeRobot (free tier)

**Setup**:
```
Monitor Type: HTTP(s)
URL: https://yourcompany.app
Check Interval: 5 minutes
Alert Contacts: [your-email]
```

**Expected Uptime**: > 99.9%

### 4. Performance Monitoring

**Firebase Performance**:
```bash
# Already configured via firebase SDK
# View: Firebase Console > Performance
```

**Custom Metrics**:
- Page load time
- API response time
- Time to Interactive

---

## Rollback Procedures

See [ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md) for detailed procedures.

### Quick Rollback

```bash
# 1. List recent deployments
firebase hosting:channel:list

# 2. Rollback to previous version
firebase hosting:rollback

# 3. Verify
curl -I https://yourcompany.app
```

### Emergency Rollback

```bash
# 1. Switch to production
firebase use production

# 2. Re-deploy previous working version
git checkout [previous-commit-hash]
npm run build
firebase deploy --only hosting

# 3. Update DNS if needed (failover)
# Point to backup hosting
```

---

## Troubleshooting

### Common Issues

#### Issue: 404 on Page Refresh

**Cause**: SPA routing not configured

**Solution**:
```json
// firebase.json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### Issue: CORS Errors

**Cause**: Firebase Storage/Firestore rules

**Solution**:
```bash
# Update storage.rules
firebase deploy --only storage:rules
```

#### Issue: App Check Blocking Requests

**Cause**: Invalid token or enforcement too strict

**Solution**:
```bash
# 1. Check App Check metrics
# Firebase Console > App Check > Metrics

# 2. Switch to Monitor mode (temporary)
# Firebase Console > App Check > Service > Monitor

# 3. Debug with browser console
# Look for: AppCheck errors
```

#### Issue: Slow Load Times

**Cause**: Large bundle size

**Solution**:
```bash
# 1. Analyze bundle
npm run build:analyze

# 2. Check for large dependencies
# Look for: chunks > 500KB

# 3. Implement code splitting
# Use React.lazy() for heavy components
```

---

## Maintenance

### Regular Tasks

**Daily**:
- [ ] Check Sentry for new errors
- [ ] Monitor uptime status
- [ ] Review Firebase Analytics dashboard

**Weekly**:
- [ ] Review performance metrics
- [ ] Check dependency updates
- [ ] Audit user feedback

**Monthly**:
- [ ] Security audit (`npm audit`)
- [ ] Performance benchmarks
- [ ] Backup verification
- [ ] SSL certificate check

### Update Process

```bash
# 1. Test in staging
firebase use staging
npm run build
firebase deploy --only hosting

# 2. Run smoke tests
npm run test:e2e:smoke

# 3. Deploy to production (if passing)
firebase use production
npm run build
firebase deploy --only hosting
```

---

## Resources

- **Firebase Hosting Docs**: https://firebase.google.com/docs/hosting
- **GitHub Actions**: https://docs.github.com/actions
- **Sentry Docs**: https://docs.sentry.io
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse

---

## Support Contacts

- **Firebase Support**: https://firebase.google.com/support
- **Emergency Hotline**: [Your number]
- **On-Call Engineer**: [Schedule link]
- **Slack Channel**: #production-alerts

---

**Last Updated**: 2025-10-17
**Maintained By**: DevOps Team
**Review Frequency**: Monthly

🚀 **Production deployment is a critical process. Follow this guide carefully and never skip validation steps.**
