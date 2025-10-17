# Operational Runbook

**Service**: Sierra Painting React Application
**Version**: 1.0.0
**Last Updated**: 2025-10-17

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Incident Response](#incident-response)
5. [Common Operations](#common-operations)
6. [Escalation Procedures](#escalation-procedures)

---

## System Overview

### Architecture

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Firebase Hosting    │ (CDN + SPA)
│ - Static Assets     │
│ - index.html        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ React Application   │
│ - Client-side       │
│ - State Management  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐     ┌──────────────┐
│ Firebase Services   │────>│ Monitoring   │
│ - Firestore        │     │ - Sentry     │
│ - Authentication   │     │ - Analytics  │
│ - Storage          │     │ - App Check  │
│ - App Check        │     └──────────────┘
└─────────────────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 19 + TypeScript | User interface |
| **Hosting** | Firebase Hosting | CDN + SPA hosting |
| **Database** | Firestore | NoSQL database |
| **Auth** | Firebase Auth | User authentication |
| **Storage** | Firebase Storage | File uploads |
| **Monitoring** | Sentry + Firebase Analytics | Error tracking & analytics |
| **Security** | Firebase App Check | Bot protection |

### Service URLs

- **Production**: https://yourcompany.app
- **Staging**: https://sierra-painting-staging.web.app
- **Firebase Console**: https://console.firebase.google.com
- **Sentry**: https://sentry.io/[org]/sierra-painting-prod
- **GitHub**: https://github.com/[org]/sierra-painting-react

---

## Deployment Procedures

### Standard Deployment

**When**: Every sprint (bi-weekly) or hotfix as needed

**Process**:

1. **Pre-Deployment** (30 minutes before)
   ```bash
   # Run full test suite
   npm run validate

   # Check staging deployment
   firebase use staging
   firebase deploy --only hosting

   # Run smoke tests on staging
   PLAYWRIGHT_BASE_URL=https://sierra-painting-staging.web.app npm run test:e2e:smoke
   ```

2. **Deployment Window** (Recommended: Tuesday 2-4 PM)
   ```bash
   # Automated via GitHub Actions
   git checkout main
   git merge develop
   git push origin main

   # Or manual:
   ./scripts/production-deploy.sh
   ```

3. **Post-Deployment** (15 minutes)
   ```bash
   # Health checks
   curl https://yourcompany.app

   # Monitor Sentry
   # Check: No new errors in last 15 min

   # Verify Firebase Analytics
   # Check: Events flowing
   ```

### Hotfix Deployment

**When**: Critical bug fix needed immediately

**Process**:

1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Make Fix & Test**
   ```bash
   # Make changes
   npm run type-check
   npm run lint
   npm test -- --run
   ```

3. **Deploy to Staging First**
   ```bash
   git push origin hotfix/critical-bug-fix
   # Triggers staging deployment
   ```

4. **Test on Staging**
   ```bash
   # Verify fix works
   # Run smoke tests
   ```

5. **Merge & Deploy to Production**
   ```bash
   git checkout main
   git merge hotfix/critical-bug-fix
   git push origin main
   # Triggers production deployment
   ```

6. **Notify Team**
   ```
   Post in #production-alerts:
   "🚨 Hotfix deployed: [description]
   - Issue: [what was broken]
   - Fix: [what was changed]
   - Deployed: [timestamp]"
   ```

### Rollback Procedure

See [ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md)

**Quick Rollback**:
```bash
firebase use production
firebase hosting:rollback
```

---

## Monitoring & Alerts

### Key Metrics

#### Application Health

| Metric | Threshold | Alert |
|--------|-----------|-------|
| **Error Rate** | > 5% | Slack + Email |
| **Uptime** | < 99.5% | Immediate |
| **Response Time** | > 3s | Warning |
| **Failed Logins** | > 10/min | Security alert |

#### Performance

| Metric | Target | Threshold |
|--------|--------|-----------|
| **LCP** | < 2.5s | > 4s alert |
| **FID** | < 100ms | > 300ms alert |
| **CLS** | < 0.1 | > 0.25 alert |
| **Bundle Size** | < 1MB | > 2MB alert |

### Alert Channels

**Sentry Alerts** → #production-alerts (Slack)
- New error types (immediate)
- Error rate spike (> 5% in 1 hour)
- Performance degradation (> 20%)

**Uptime Alerts** → Email + SMS
- Site down (> 2 minutes)
- SSL certificate expiring (< 7 days)

**Firebase Alerts** → Email
- Firestore quota exceeded (> 80%)
- Storage quota exceeded (> 80%)
- Auth quota exceeded (> 80%)

### Dashboard Links

- **Sentry**: https://sentry.io/[org]/sierra-painting-prod
- **Firebase**: https://console.firebase.google.com/project/sierra-painting-prod
- **Uptime Robot**: https://uptimerobot.com/dashboard
- **GitHub Actions**: https://github.com/[org]/sierra-painting-react/actions

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P0 - Critical** | Service down | < 15 min | Site unreachable |
| **P1 - High** | Major feature broken | < 1 hour | Can't create invoices |
| **P2 - Medium** | Minor feature broken | < 4 hours | Export not working |
| **P3 - Low** | Cosmetic issue | < 24 hours | UI alignment issue |

### P0 - Critical Incident

**Examples**: Site down, auth broken, data loss

**Response**:

1. **Acknowledge** (< 5 min)
   ```
   Post in #production-alerts:
   "🚨 P0 INCIDENT - [description]
   Status: Investigating
   Owner: @[your-name]"
   ```

2. **Assess** (< 10 min)
   ```bash
   # Check uptime
   curl -I https://yourcompany.app

   # Check Sentry
   # Look for: Recent error spikes

   # Check Firebase status
   # https://status.firebase.google.com
   ```

3. **Mitigate** (< 15 min)
   ```bash
   # Option 1: Rollback
   firebase hosting:rollback

   # Option 2: Hotfix deploy
   ./scripts/production-deploy.sh

   # Option 3: Maintenance mode
   # Show: "We'll be back soon" page
   ```

4. **Communicate**
   ```
   Update #production-alerts every 15 min:
   "[Timestamp] Update: [status]
   Actions taken: [what you did]
   Next steps: [what's next]"
   ```

5. **Resolve**
   ```
   Post in #production-alerts:
   "✅ RESOLVED - [description]
   Root cause: [what happened]
   Fix: [how it was fixed]
   Duration: [downtime]
   Next: Post-mortem scheduled"
   ```

6. **Post-Mortem** (within 48 hours)
   - Create document: `docs/post-mortems/YYYY-MM-DD-incident.md`
   - Include: Timeline, root cause, action items
   - Review in team meeting

### P1 - High Severity

**Examples**: Job creation broken, invoice payment failing

**Response**:

1. **Acknowledge** (< 30 min)
2. **Investigate** (< 1 hour)
   ```bash
   # Check Sentry for errors
   # Check Firebase Console for quota issues
   # Check recent deployments
   ```

3. **Fix**
   - If recent deployment: Rollback
   - If code issue: Hotfix
   - If external: Contact support

4. **Validate**
   ```bash
   # Test the broken feature
   # Verify fix in production
   ```

### Communication Templates

**Incident Start**:
```
🚨 [P0/P1] INCIDENT - [Title]

What: [Brief description]
Impact: [What users are experiencing]
Status: Investigating
Owner: @[name]
Started: [timestamp]
```

**Incident Update**:
```
📊 UPDATE - [Title]

Status: [Investigating/Fixing/Monitoring]
Actions: [What we've done]
Next: [What's next]
ETA: [Expected resolution]
```

**Incident Resolved**:
```
✅ RESOLVED - [Title]

Root Cause: [What happened]
Fix: [How it was fixed]
Duration: [Total downtime]
Prevention: [How to prevent]
Post-Mortem: [Link to doc]
```

---

## Common Operations

### Viewing Logs

**Sentry (Error Logs)**:
```
1. Go to: https://sentry.io/[org]/sierra-painting-prod
2. Filter by:
   - Time range
   - Error type
   - User ID
```

**Firebase Analytics (Usage)**:
```
1. Go to: Firebase Console > Analytics
2. View:
   - Events
   - User properties
   - Screen views
```

**Audit Logs**:
```typescript
// Via admin panel (implemented in app)
// Or via Firestore:
firebase firestore:get auditLogs \
  --where 'timestamp' '>' '2025-10-15' \
  --limit 100
```

### Managing Users

**View Active Users**:
```bash
firebase auth:export users.json --format=json
cat users.json | jq '.users | length'
```

**Disable User** (emergency):
```bash
firebase auth:delete [user-uid]
```

**Reset Password**:
```
Via app: Admin Panel > Users > Reset Password
Or: Firebase Console > Authentication > Users > Reset
```

### Database Operations

**Backup Firestore**:
```bash
# Automated daily backups configured
# Manual backup:
gcloud firestore export gs://[bucket]/backup-$(date +%Y%m%d)
```

**Restore from Backup**:
```bash
gcloud firestore import gs://[bucket]/backup-20251017
```

**Query Data**:
```bash
# Via Firebase Console > Firestore > Query
# Or via CLI:
firebase firestore:get jobs --where 'status' '==' 'active'
```

### Clearing Cache

**CDN Cache (Firebase Hosting)**:
```bash
# Cache clears automatically after deployment
# Force clear:
curl -X PURGE https://yourcompany.app
```

**Browser Cache**:
```
Users: Hard refresh (Ctrl+Shift+R)
Or: Bump version in index.html
```

---

## Escalation Procedures

### On-Call Schedule

**Current On-Call**: Check #on-call channel

**Rotation**: Weekly, Monday 9 AM - Monday 9 AM

**Responsibilities**:
- Monitor #production-alerts
- Respond to incidents < 15 min
- Perform deployments
- Handle emergency rollbacks

### Escalation Path

**Level 1**: On-Call Engineer
- First responder
- Handle P2-P3 incidents
- Escalate P0-P1 if needed

**Level 2**: Tech Lead
- Handle P0-P1 incidents
- Make architectural decisions
- Coordinate with stakeholders

**Level 3**: CTO
- Critical outages > 2 hours
- Security breaches
- Data loss incidents

### Contact Information

```
On-Call Engineer: Check PagerDuty
Tech Lead: [Email/Phone]
CTO: [Email/Phone]
Firebase Support: https://firebase.google.com/support
Sentry Support: support@sentry.io
```

---

## Maintenance Windows

### Scheduled Maintenance

**Frequency**: First Tuesday of month, 2-4 AM

**Process**:
1. **Announce** (7 days prior)
   - Email to users
   - In-app banner
   - Status page update

2. **Prepare**
   - Backup database
   - Test changes in staging
   - Prepare rollback plan

3. **Execute**
   - Deploy during window
   - Monitor closely
   - Validate changes

4. **Communicate**
   - Announce completion
   - Remove maintenance banner
   - Update status page

### Emergency Maintenance

**When**: Critical security patch, data issue

**Process**:
1. **Assess**: Is it truly emergency?
2. **Notify**: Post in #production-alerts
3. **Execute**: Deploy immediately
4. **Communicate**: Email users after

---

## Security

### Security Incident Response

**Examples**: Data breach, unauthorized access, DDoS attack

**Immediate Actions**:
1. **Contain**
   ```bash
   # Disable affected users
   firebase auth:delete [compromised-uid]

   # Block IP addresses (via Firebase)
   # Enable App Check enforcement
   ```

2. **Assess**
   - Check audit logs
   - Review Firestore access logs
   - Identify scope of breach

3. **Notify**
   - Legal team
   - Affected users (if PII involved)
   - Regulatory bodies (if required)

4. **Remediate**
   - Patch vulnerability
   - Reset passwords
   - Revoke tokens

### Security Contacts

- **Security Team**: security@company.com
- **Legal**: legal@company.com
- **Google Cloud Security**: https://cloud.google.com/security-command-center

---

## Appendix

### Useful Commands

```bash
# Check deployment status
firebase hosting:channel:list

# View Firestore stats
firebase firestore:stats

# Export auth users
firebase auth:export users.json

# Test with emulators
npm run emulators:start

# Run performance audit
npm run build:analyze
```

### Runbook Checklist

**For Each Deployment**:
- [ ] Tests passing
- [ ] Staging deployed & tested
- [ ] Backup created
- [ ] Team notified
- [ ] Monitoring active
- [ ] Rollback plan ready

**For Each Incident**:
- [ ] Acknowledged in < 15 min
- [ ] Status posted in Slack
- [ ] Stakeholders notified
- [ ] Fix deployed
- [ ] Post-mortem scheduled

---

**This runbook is a living document. Update it after each incident or deployment to reflect lessons learned.**

**Last Updated**: 2025-10-17
**Owner**: DevOps Team
**Review**: Monthly
