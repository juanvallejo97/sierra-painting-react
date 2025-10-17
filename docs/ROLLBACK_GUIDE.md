# Emergency Rollback Guide

**Date**: 2025-10-17
**Status**: ✅ Production Ready
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [When to Rollback](#when-to-rollback)
3. [Quick Rollback (< 5 minutes)](#quick-rollback--5-minutes)
4. [Full Rollback (< 15 minutes)](#full-rollback--15-minutes)
5. [Database Rollback](#database-rollback)
6. [DNS Failover](#dns-failover)
7. [Rollback Validation](#rollback-validation)
8. [Post-Rollback Procedures](#post-rollback-procedures)
9. [Communication Templates](#communication-templates)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step procedures for emergency rollbacks when a production deployment causes critical issues.

### Rollback Capabilities

| Method | Speed | Scope | Risk | When to Use |
|--------|-------|-------|------|-------------|
| **Firebase Hosting Rollback** | < 5 min | Frontend only | Low | UI bugs, JS errors |
| **Git Revert + Redeploy** | < 15 min | Full stack | Medium | Backend changes, rules |
| **Database Restore** | 30-60 min | Data only | High | Data corruption |
| **DNS Failover** | 5-30 min | Full site | Low | Complete outage |

---

## When to Rollback

### ✅ Rollback Immediately

- **Site is down** (returning 500 errors)
- **Authentication broken** (users can't log in)
- **Critical functionality broken** (can't create jobs/invoices)
- **Data corruption detected** (incorrect data being saved)
- **Security vulnerability introduced** (unauthorized access)
- **Performance degradation > 50%** (page load > 10s)

### ⚠️ Consider Rollback

- **Non-critical feature broken** (one feature doesn't work)
- **UI bugs** (visual issues, layout problems)
- **Minor performance issues** (slightly slower)
- **Error rate 5-10%** (affecting some users)

### ❌ Don't Rollback

- **Single user report** (investigate first)
- **Cosmetic issues** (typos, minor styling)
- **Already working on hotfix** (< 30 min to fix)
- **Issue only in specific browser** (can be fixed incrementally)

---

## Quick Rollback (< 5 minutes)

**Use Case**: Frontend-only issues (UI bugs, JavaScript errors)

### Step 1: Verify Issue (< 1 min)

```bash
# Check if site is accessible
curl -I https://yourcompany.app
# Expected: HTTP/2 200 or 500 (if broken)

# Check recent Sentry errors
# Go to: https://sentry.io/[org]/sierra-painting-prod
# Look for: Error spike in last 15 minutes
```

### Step 2: Initiate Rollback (< 2 min)

```bash
# Switch to production project
firebase use production

# List recent deployments
firebase hosting:channel:list

# View deployment history
firebase hosting:clone

# Rollback to previous version (ONE COMMAND)
firebase hosting:rollback
```

**Output**:
```
✔ Rollback successful
✔ Now serving: sierra-painting-prod (version abc123)
✔ Previous version restored in 45 seconds
```

### Step 3: Verify Rollback (< 2 min)

```bash
# Clear CDN cache
curl -X PURGE https://yourcompany.app

# Verify site loads
curl https://yourcompany.app | grep "<title>"
# Expected: <title>Sierra Painting</title>

# Check Sentry (errors should stop)
# Wait 2-3 minutes, verify no new errors
```

### Step 4: Notify Team

```
Post in #production-alerts:
"✅ ROLLBACK COMPLETE
- Rolled back to previous version
- Site is stable
- Investigating root cause"
```

---

## Full Rollback (< 15 minutes)

**Use Case**: Backend changes (Firestore rules, security changes, data structure changes)

### Step 1: Identify Last Good Commit (< 3 min)

```bash
# View recent commits
git log --oneline -10

# Check GitHub deployments
gh run list --limit 10

# Identify last successful deployment before issue
# Example: commit abc123 from 2 hours ago
```

### Step 2: Checkout Previous Version (< 2 min)

```bash
# Create rollback branch
git checkout main
git pull origin main

# Checkout last good commit
LAST_GOOD_COMMIT="abc123"  # Replace with actual commit
git checkout $LAST_GOOD_COMMIT -b rollback/emergency-$(date +%Y%m%d-%H%M)

# Verify correct version
git log -1 --oneline
```

### Step 3: Deploy Previous Version (< 8 min)

```bash
# Install dependencies (if package.json changed)
npm install

# Build production bundle
npm run build
# Expected: ✓ built in ~60s

# Deploy to Firebase
firebase use production

# Deploy hosting + rules + indexes
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage:rules

# Or deploy all at once:
firebase deploy
```

**Deployment Output**:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/...
Hosting URL: https://yourcompany.app

Deployed:
- Hosting: abc123
- Firestore Rules: deployed
- Firestore Indexes: deployed
- Storage Rules: deployed
```

### Step 4: Validate Deployment (< 2 min)

```bash
# Run health checks
curl https://yourcompany.app
curl https://yourcompany.app/jobs
curl https://yourcompany.app/invoices

# Test authentication (manual)
# 1. Go to https://yourcompany.app
# 2. Click "Sign In"
# 3. Enter test credentials
# 4. Verify successful login

# Test data access (manual)
# 1. Navigate to Jobs page
# 2. Verify jobs load
# 3. Try creating a new job
# 4. Verify creation works
```

### Step 5: Update Main Branch

```bash
# Force push rollback to main (emergency only)
git checkout main
git reset --hard $LAST_GOOD_COMMIT
git push origin main --force-with-lease

# Or create PR for review (if time permits)
git push origin rollback/emergency-$(date +%Y%m%d-%H%M)
gh pr create --title "Emergency Rollback" --body "Rolled back to $LAST_GOOD_COMMIT due to production issue"
```

---

## Database Rollback

**⚠️ WARNING**: Database rollbacks are destructive and should be last resort

**Use Case**: Data corruption, accidental deletion, schema changes breaking app

### Prerequisites

- [ ] Confirm backup exists
- [ ] Estimate data loss window (time since backup)
- [ ] Get approval from CTO/Tech Lead
- [ ] Notify all users (maintenance mode)

### Step 1: Enable Maintenance Mode

```bash
# Deploy maintenance page
cat > dist/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Maintenance - Sierra Painting</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding-top: 100px;">
  <h1>🛠️ Scheduled Maintenance</h1>
  <p>We'll be back shortly. Thank you for your patience.</p>
  <p>Estimated completion: 30 minutes</p>
</body>
</html>
EOF

firebase deploy --only hosting
```

### Step 2: List Available Backups

```bash
# List Firestore backups
gcloud firestore backups list \
  --database="(default)" \
  --format="table(name, state, createTime)"

# Example output:
# NAME                                          STATE      CREATE_TIME
# projects/.../backups/backup-20251017-0200    READY      2025-10-17T02:00:00Z
# projects/.../backups/backup-20251016-0200    READY      2025-10-16T02:00:00Z
```

### Step 3: Restore from Backup

```bash
# Identify backup to restore
BACKUP_NAME="projects/sierra-painting-prod/backups/backup-20251017-0200"

# Restore Firestore (THIS OVERWRITES ALL DATA)
gcloud firestore import gs://sierra-painting-prod-backups/2025-10-17-0200

# Monitor restore progress
gcloud firestore operations list --database="(default)"
```

**Restore Time**: 10-60 minutes depending on database size

### Step 4: Verify Data Integrity

```bash
# Manual verification checklist:
# [ ] Random sample of jobs exist
# [ ] Random sample of invoices exist
# [ ] User accounts exist
# [ ] Company data intact
# [ ] No duplicate records
# [ ] Timestamps look correct

# Query sample data
firebase firestore:get jobs --limit 10
firebase firestore:get invoices --limit 10
firebase firestore:get users --limit 10
```

### Step 5: Disable Maintenance Mode

```bash
# Redeploy normal application
npm run build
firebase deploy --only hosting
```

### Step 6: Communicate Data Loss

```
Email to all users:
Subject: Database Maintenance Completed

We've completed emergency database maintenance to resolve a critical issue.

Impact:
- Service was unavailable for [X] minutes
- Data changes between [TIME] and [TIME] were lost
- All data prior to [TIME] has been restored

Actions Required:
- Please verify your recent data
- Re-enter any changes made during the affected time period

We apologize for the inconvenience.
```

---

## DNS Failover

**Use Case**: Complete Firebase outage, need to redirect to backup hosting

### Prerequisites

- [ ] Backup hosting configured (e.g., Netlify, Vercel, AWS S3)
- [ ] Backup hosting has recent deployment
- [ ] DNS TTL is low (< 5 minutes)

### Step 1: Deploy to Backup Hosting

```bash
# Example: Netlify
npm run build
netlify deploy --prod --dir=dist

# Example: Vercel
npm run build
vercel --prod

# Example: AWS S3
npm run build
aws s3 sync dist/ s3://sierra-painting-backup/
```

### Step 2: Update DNS Records

**At your DNS provider** (e.g., Cloudflare, Route53):

1. **Navigate to DNS settings**
2. **Update A records**:
   ```
   Type: A
   Name: @
   Value: [New IP from backup hosting]
   TTL: 300 (5 minutes)
   ```

3. **Update CNAME records**:
   ```
   Type: CNAME
   Name: www
   Value: [Backup hosting domain]
   TTL: 300 (5 minutes)
   ```

### Step 3: Wait for DNS Propagation

```bash
# Check DNS propagation
dig +short yourcompany.app
# Expected: New IP address

# Check from multiple locations
nslookup yourcompany.app 8.8.8.8  # Google DNS
nslookup yourcompany.app 1.1.1.1  # Cloudflare DNS

# Use online tools
# https://dnschecker.org
```

**Propagation Time**: 5-30 minutes (depending on TTL)

### Step 4: Verify Backup Site

```bash
# Test backup site
curl -I https://yourcompany.app
# Expected: HTTP/2 200 from backup hosting

# Manual verification:
# 1. Visit https://yourcompany.app
# 2. Verify site loads
# 3. Test authentication
# 4. Verify basic functionality
```

### Step 5: Revert DNS When Ready

**When Firebase is back online**:

1. **Redeploy to Firebase** (if needed)
2. **Update DNS back to Firebase IPs**:
   ```
   Type: A
   Name: @
   Value: 151.101.1.195, 151.101.65.195
   TTL: 3600 (1 hour)
   ```
3. **Wait for propagation**
4. **Verify Firebase serving traffic**

---

## Rollback Validation

### Automated Validation

```bash
#!/bin/bash
# rollback-validation.sh

echo "🔍 Validating rollback..."

# 1. Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://yourcompany.app)
if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Site is accessible (HTTP $HTTP_CODE)"
else
  echo "❌ Site is NOT accessible (HTTP $HTTP_CODE)"
  exit 1
fi

# 2. JavaScript load check
if curl -s https://yourcompany.app | grep -q "assets/index"; then
  echo "✅ JavaScript bundles loading"
else
  echo "❌ JavaScript bundles NOT loading"
  exit 1
fi

# 3. API connectivity check
# (Requires test credentials)
echo "⏭️  Manual: Test authentication"
echo "⏭️  Manual: Test data loading"

echo "✅ Rollback validation complete"
```

### Manual Validation Checklist

**Critical Path Testing** (5 minutes):

- [ ] **Homepage loads**
  - Go to https://yourcompany.app
  - Verify no JavaScript errors in console
  - Verify UI renders correctly

- [ ] **Authentication works**
  - Click "Sign In"
  - Enter test credentials
  - Verify successful login
  - Verify redirected to dashboard

- [ ] **Data loading works**
  - Navigate to Jobs page
  - Verify jobs load (not empty state)
  - Navigate to Invoices page
  - Verify invoices load

- [ ] **Data creation works**
  - Click "New Job"
  - Fill in required fields
  - Click "Create"
  - Verify job appears in list

- [ ] **No Sentry errors**
  - Go to Sentry dashboard
  - Check last 15 minutes
  - Verify no new error spikes

---

## Post-Rollback Procedures

### Immediate Actions (< 30 min)

1. **Notify Stakeholders**
   ```
   Post in #production-alerts:
   "✅ Rollback complete. Site is stable.

   Timeline:
   - Issue detected: [TIME]
   - Rollback initiated: [TIME]
   - Rollback complete: [TIME]
   - Total downtime: [DURATION]

   Next: Post-mortem scheduled for [DATE/TIME]"
   ```

2. **Update Status Page**
   - Mark incident as "Resolved"
   - Provide brief explanation
   - Include timeline

3. **Monitor Closely**
   - Watch Sentry for 1 hour
   - Check Firebase Analytics
   - Monitor user reports

### Within 24 Hours

1. **Root Cause Analysis**
   - Identify what went wrong
   - Determine why it wasn't caught
   - Document lessons learned

2. **Create Post-Mortem Document**
   ```markdown
   # Post-Mortem: [Date] Production Rollback

   ## Incident Summary
   - What: [Brief description]
   - When: [Date/Time]
   - Duration: [Total downtime]
   - Impact: [Number of users affected]

   ## Timeline
   - [TIME]: Issue detected
   - [TIME]: Rollback initiated
   - [TIME]: Rollback complete

   ## Root Cause
   [Detailed explanation of what went wrong]

   ## What Went Well
   - [Things that worked during incident response]

   ## What Went Poorly
   - [Things that didn't work well]

   ## Action Items
   - [ ] [Preventive measure 1] - @owner
   - [ ] [Preventive measure 2] - @owner

   ## Lessons Learned
   [Key takeaways]
   ```

3. **Implement Preventive Measures**
   - Update tests to catch similar issues
   - Improve deployment checklist
   - Add monitoring/alerts
   - Update documentation

### Within 1 Week

1. **Review & Improve**
   - Team post-mortem meeting
   - Update rollback procedures based on learnings
   - Add missing tests
   - Improve CI/CD pipeline

2. **User Communication**
   ```
   Email to affected users:
   Subject: Update on [Date] Service Interruption

   Last [DAY], we experienced a service interruption that
   required us to roll back to a previous version.

   What happened:
   [Brief, non-technical explanation]

   Impact:
   - Service was unavailable for [DURATION]
   - [Specific features affected]

   What we're doing to prevent this:
   - [Preventive measure 1]
   - [Preventive measure 2]

   We apologize for the inconvenience and appreciate your patience.
   ```

---

## Communication Templates

### Rollback Initiated

```
🚨 ROLLBACK INITIATED

Issue: [Brief description]
Severity: P0 - Critical
Action: Rolling back to previous version
ETA: 5-15 minutes
Owner: @[your-name]

Updates every 5 minutes.
```

### Rollback In Progress

```
📊 UPDATE - Rollback in progress

Status: [X/Y steps complete]
Current Step: [What's happening now]
ETA: [Estimated completion]
No user action required.
```

### Rollback Complete

```
✅ ROLLBACK COMPLETE

Status: Site is stable
Rollback Time: [Duration]
Version: Reverted to [commit/timestamp]
Validation: All health checks passing

Monitoring closely for next hour.
Post-mortem scheduled for [DATE/TIME].
```

### Rollback Failed

```
🚨 ROLLBACK FAILED

Issue: [What went wrong during rollback]
Status: Escalating to Level 2
Action: [Alternative approach]
ETA: [New estimated completion]

Updates every 5 minutes.
```

---

## Troubleshooting

### Issue: Rollback Command Fails

**Error**: `firebase hosting:rollback` returns error

**Possible Causes**:
1. Not enough deployment history
2. Wrong project selected
3. Insufficient permissions

**Solution**:
```bash
# Verify project
firebase use production
firebase projects:list

# Check permissions
firebase login --reauth

# Alternative: Manual revert
git checkout main
git reset --hard [last-good-commit]
npm run build
firebase deploy --only hosting
```

### Issue: Site Still Broken After Rollback

**Error**: Site shows old issues even after rollback

**Possible Causes**:
1. CDN cache not cleared
2. Browser cache
3. Issue is in backend, not frontend

**Solution**:
```bash
# Force CDN cache clear
curl -X PURGE https://yourcompany.app

# Check what version is deployed
curl -I https://yourcompany.app | grep "x-firebase-hosting"

# Deploy again with cache busting
firebase deploy --only hosting --force

# Test in incognito mode
# Test from different network
```

### Issue: Database Restore Taking Too Long

**Error**: Firestore import running for > 1 hour

**Possible Causes**:
1. Large database size
2. Network issues
3. GCP resource constraints

**Solution**:
```bash
# Check restore operation status
gcloud firestore operations list

# If stuck, cancel and retry
gcloud firestore operations cancel [OPERATION_NAME]

# Use smaller, targeted restore
# (Only restore affected collections)

# Contact Firebase support if critical
# https://firebase.google.com/support
```

### Issue: Users Still See Old Version

**Error**: Users report seeing cached version

**Possible Causes**:
1. Browser cache
2. Service worker cache
3. CDN edge caching

**Solution**:

**For Users**:
```
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Try incognito/private mode
```

**For Developers**:
```bash
# Update index.html with cache-busting
# firebase.json already has:
"headers": [
  {
    "source": "index.html",
    "headers": [
      {
        "key": "Cache-Control",
        "value": "no-cache, no-store, must-revalidate"
      }
    ]
  }
]

# Redeploy
firebase deploy --only hosting
```

---

## Rollback Decision Tree

```
                    [Production Issue Detected]
                              |
                              v
                    [Is site completely down?]
                         /          \
                       YES           NO
                        |             |
                        v             v
                  [DNS Failover]  [Error rate > 50%?]
                                     /        \
                                   YES        NO
                                    |          |
                                    v          v
                            [Full Rollback] [Is critical feature broken?]
                                               /              \
                                             YES              NO
                                              |                |
                                              v                v
                                      [Quick Rollback]  [Create Hotfix]
                                              |                |
                                              v                v
                                        [Validate]        [Monitor]
                                              |                |
                                              v                v
                                         [Success?]       [Issue resolved?]
                                         /      \            /        \
                                       YES      NO         YES        NO
                                        |        |          |          |
                                        v        v          v          v
                                   [Monitor] [Escalate] [Document] [Rollback]
```

---

## Emergency Contacts

**On-Call Engineer**: Check PagerDuty
**Tech Lead**: [Phone/Email]
**CTO**: [Phone/Email]

**Firebase Support**: https://firebase.google.com/support
**Emergency Hotline**: [Your emergency number]
**Slack Channel**: #production-alerts

---

**Last Updated**: 2025-10-17
**Maintained By**: DevOps Team
**Review**: After each rollback incident

⚠️ **This guide is critical for production stability. Keep it up to date and practice rollback procedures regularly.**
