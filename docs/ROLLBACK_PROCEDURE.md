# Rollback Procedure

This document outlines the steps to roll back a deployment if issues are detected in production or staging.

## When to Rollback

Initiate a rollback if you observe:

- **Critical bugs** affecting core functionality
- **Data integrity issues** or data loss
- **Performance degradation** (p95 > 3s, error rate > 5%)
- **Security vulnerabilities** discovered post-deployment
- **Accessibility regressions** preventing user access
- **Failed smoke tests** after deployment

## Pre-Rollback Checklist

Before initiating rollback, verify:

- [ ] Issue is confirmed and reproducible
- [ ] Root cause is deployment-related (not infrastructure)
- [ ] Rollback will resolve the issue
- [ ] Stakeholders are notified
- [ ] Incident channel is active (#incidents in Slack)

## Rollback Steps

### Option 1: Firebase Hosting Rollback (Fastest)

**Time**: ~2 minutes

```bash
# 1. View deployment history
firebase hosting:channel:list

# 2. Identify previous stable version
# Look for the version before the problematic deployment

# 3. Rollback hosting only
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID SITE_ID:live
```

**Example**:

```bash
# Rollback staging to previous version
firebase hosting:clone sierra-painting-staging:v1-0-1 sierra-painting-staging:live
```

### Option 2: Full Application Rollback (Recommended)

**Time**: ~5-10 minutes

```bash
# 1. Identify the last stable git tag
git tag --sort=-v:refname | head -5

# 2. Check out the stable version
git checkout tags/v1.0.1-staging

# 3. Redeploy from stable version
npm run build
firebase deploy --only hosting

# 4. Verify rollback successful
npm run smoke:staging
```

### Option 3: Firestore Rules Rollback

**Time**: ~1 minute

If the issue is with Firestore security rules:

```bash
# 1. View rules deployment history
firebase firestore:rules:list

# 2. Rollback to previous rules version
firebase firestore:rules:release <RULESET_ID>
```

### Option 4: Cloud Functions Rollback

**Time**: ~3-5 minutes

```bash
# 1. List function versions
gcloud functions list --project=sierra-painting-staging

# 2. Rollback specific function
gcloud functions deploy FUNCTION_NAME \
  --source=gs://BUCKET/previous-version.zip \
  --project=sierra-painting-staging
```

## Post-Rollback Actions

After rollback is complete:

1. **Verify System Health**

   ```bash
   # Run smoke tests
   npm run smoke:staging

   # Check Sentry for errors
   open https://sentry.io/organizations/sierra/projects/staging

   # Monitor Web Vitals
   # Check Firebase Performance Monitoring
   ```

2. **Update Status**
   - [ ] Update incident channel with rollback status
   - [ ] Notify stakeholders of restoration
   - [ ] Update status page if applicable

3. **Root Cause Analysis**
   - Document what went wrong
   - Identify why it wasn't caught in testing
   - Create ticket for fix and additional tests
   - Schedule post-mortem if critical incident

4. **Deployment Tag Management**

   ```bash
   # Delete bad deployment tag
   git tag -d v1.0.2-staging
   git push origin :refs/tags/v1.0.2-staging

   # Create rollback tag for tracking
   git tag -a v1.0.1-staging-rollback -m "Rollback from v1.0.2 due to [issue]"
   git push origin v1.0.1-staging-rollback
   ```

## Rollback Testing

Rollback procedures should be tested regularly:

**Quarterly Rollback Drill**:

1. Deploy a test version to staging
2. Immediately roll back
3. Verify all systems operational
4. Document time taken and any issues
5. Update this procedure if needed

## Emergency Contacts

- **On-Call Engineer**: Check PagerDuty rotation
- **DevOps Lead**: [Contact info]
- **CTO**: [Contact info]
- **Firebase Support**: https://firebase.google.com/support

## Rollback Decision Matrix

| Severity      | Response Time | Rollback Decision        | Approval Required          |
| ------------- | ------------- | ------------------------ | -------------------------- |
| P0 (Critical) | Immediate     | Always rollback          | None - proceed immediately |
| P1 (High)     | < 30 min      | Likely rollback          | Engineering lead           |
| P2 (Medium)   | < 2 hours     | Evaluate fix vs rollback | Product + Engineering      |
| P3 (Low)      | Next sprint   | Fix forward              | Team decision              |

## Rollback Metrics

Track these metrics for each rollback:

- Time to detect issue
- Time to decision
- Time to complete rollback
- Time to full recovery
- User impact (estimated affected users)
- Data impact (if any)

## Prevention

To minimize the need for rollbacks:

1. **Comprehensive Testing**
   - 75%+ test coverage
   - E2E tests for critical flows
   - Load testing before deployment
   - Staging environment validation

2. **Gradual Rollout**
   - Deploy to staging first
   - Monitor for 24-48 hours
   - Gradual production rollout (10% → 50% → 100%)

3. **Feature Flags**
   - New features behind flags
   - Ability to disable without deployment

4. **Monitoring & Alerts**
   - Sentry error tracking
   - Web Vitals monitoring
   - Firebase Performance Monitoring
   - Custom business metrics

## Version History

| Version | Date       | Changes                    |
| ------- | ---------- | -------------------------- |
| 1.0     | 2025-10-18 | Initial rollback procedure |

---

**Remember**: Rollbacks are a safety mechanism, not a failure. Use them confidently when needed to protect users and data.
