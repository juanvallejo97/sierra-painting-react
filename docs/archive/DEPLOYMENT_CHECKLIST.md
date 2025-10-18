# Production Deployment Checklist

**Version**: 1.0.0
**Last Updated**: 2025-10-17

---

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [ ] **TypeScript type check passes**

  ```bash
  npm run type-check
  ```

  Expected: `Found 0 errors`

- [ ] **ESLint passes**

  ```bash
  npm run lint
  ```

  Expected: `0 errors` (warnings acceptable if documented)

- [ ] **All unit tests pass**

  ```bash
  npm test -- --run
  ```

  Expected: `32 tests passing`

- [ ] **Code formatted**

  ```bash
  npm run format:check
  ```

  Expected: All files formatted correctly

- [ ] **Build succeeds**
  ```bash
  npm run build
  ```
  Expected: Successful build with no errors

---

### 2. Security Audit ✅

- [ ] **No critical/high npm vulnerabilities**

  ```bash
  npm audit --production
  ```

  Expected: `0 vulnerabilities` or only low/moderate

- [ ] **Firestore rules tested**

  ```bash
  npm run test:rules
  ```

  Expected: All security rules tests passing

- [ ] **Environment variables reviewed**
  - [ ] No secrets in `.env.production`
  - [ ] All required variables present
  - [ ] API keys valid and not expired

- [ ] **Firebase App Check configured**
  - [ ] reCAPTCHA site key for production
  - [ ] Debug tokens removed
  - [ ] Enforcement mode set correctly

---

### 3. Performance Benchmarks ✅

- [ ] **Bundle size analyzed**

  ```bash
  npm run build:analyze
  ```

  Expected: Total bundle < 3MB gzipped

- [ ] **Lighthouse audit run**

  ```bash
  npm run build
  npx lighthouse http://localhost:5173 --view
  ```

  Expected:
  - Performance: > 90
  - Accessibility: > 95
  - Best Practices: > 95
  - SEO: > 90

- [ ] **Load time acceptable**
      Expected: First Contentful Paint < 1.5s

---

### 4. Database & Storage ✅

- [ ] **Firestore indexes deployed**

  ```bash
  firebase firestore:indexes
  ```

  Expected: All required indexes created

- [ ] **Storage rules deployed**

  ```bash
  firebase deploy --only storage:rules
  ```

  Expected: Rules deployed successfully

- [ ] **Backup verified**
  - [ ] Automated backups configured in GCP
  - [ ] Recent backup exists (< 24 hours old)
  - [ ] Backup restore tested

---

### 5. Staging Verification ✅

- [ ] **Deployed to staging**

  ```bash
  firebase use staging
  npm run build
  firebase deploy --only hosting
  ```

- [ ] **Smoke tests passed**

  ```bash
  PLAYWRIGHT_BASE_URL=https://sierra-painting-staging.web.app npm run test:e2e:smoke
  ```

  Expected: All critical flows passing

- [ ] **Manual testing complete**
  - [ ] Login/logout works
  - [ ] Jobs CRUD operations work
  - [ ] Invoices CRUD operations work
  - [ ] User management works
  - [ ] No console errors

---

### 6. Monitoring Setup ✅

- [ ] **Sentry configured**
  - [ ] DSN in `.env.production`
  - [ ] Source maps upload configured
  - [ ] Test error sent and received

- [ ] **Firebase Analytics enabled**
  - [ ] Measurement ID in `.env.production`
  - [ ] Analytics initialized in code

- [ ] **Alerts configured**
  - [ ] Sentry alerts to Slack/Email
  - [ ] Uptime monitoring active
  - [ ] Error rate alerts set

---

### 7. Team Communication ✅

- [ ] **Team notified**
  - [ ] Deployment window announced (24h advance)
  - [ ] Stakeholders informed
  - [ ] #production-alerts channel ready

- [ ] **Deployment plan reviewed**
  - [ ] Deployment steps documented
  - [ ] Rollback plan ready
  - [ ] On-call engineer identified

---

## Deployment Execution

### 8. Pre-Deployment Actions

- [ ] **Switch to production project**

  ```bash
  firebase use production
  ```

- [ ] **Verify correct branch**

  ```bash
  git status
  ```

  Expected: On `main` branch with no uncommitted changes

- [ ] **Pull latest changes**

  ```bash
  git pull origin main
  ```

- [ ] **Install dependencies**
  ```bash
  npm ci
  ```

---

### 9. Deployment Methods

**Choose one:**

#### Option A: Automated Script (Recommended)

- [ ] **Run deployment script**
  ```bash
  ./scripts/production-deploy.sh
  ```
  The script will:
  - Run all pre-flight checks
  - Build production bundle
  - Deploy to staging first (optional)
  - Deploy to production
  - Run post-deployment validation
  - Tag release

#### Option B: Manual Deployment

- [ ] **Build application**

  ```bash
  npm run build
  ```

- [ ] **Deploy hosting**

  ```bash
  firebase deploy --only hosting
  ```

- [ ] **Deploy Firestore rules**

  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Deploy Storage rules**

  ```bash
  firebase deploy --only storage:rules
  ```

- [ ] **Deploy indexes**
  ```bash
  firebase deploy --only firestore:indexes
  ```

#### Option C: GitHub Actions (CI/CD)

- [ ] **Merge to main**

  ```bash
  git checkout main
  git merge develop
  git push origin main
  ```

- [ ] **Monitor workflow**
  - Go to GitHub > Actions
  - Watch "Deploy to Production" workflow
  - Ensure all steps pass

---

## Post-Deployment Validation

### 10. Health Checks (Run in Order)

- [ ] **Site loads**

  ```bash
  curl -I https://yourcompany.app
  ```

  Expected: `HTTP/2 200`

- [ ] **SPA routing works**

  ```bash
  curl -I https://yourcompany.app/jobs
  ```

  Expected: `HTTP/2 200` (serves index.html)

- [ ] **JavaScript bundles load**
  ```bash
  curl -s https://yourcompany.app | grep "assets/index"
  ```
  Expected: Bundle references found

---

### 11. Functional Testing

- [ ] **Authentication works**
  - [ ] Navigate to site
  - [ ] Click "Sign In"
  - [ ] Enter credentials
  - [ ] Verify successful login

- [ ] **Data loading works**
  - [ ] Jobs page loads with data
  - [ ] Invoices page loads with data
  - [ ] Dashboard displays metrics

- [ ] **Data creation works**
  - [ ] Create new job
  - [ ] Create new invoice
  - [ ] Verify data appears correctly

---

### 12. Monitoring Validation

- [ ] **Analytics tracking**
  - [ ] Open browser DevTools > Network
  - [ ] Navigate through app
  - [ ] Verify requests to `google-analytics.com`

- [ ] **Error tracking**
  - [ ] Trigger test error in console
  - [ ] Check Sentry dashboard
  - [ ] Verify error appears (< 1 minute)

- [ ] **App Check working**
  - [ ] Open DevTools > Network
  - [ ] Make Firestore request
  - [ ] Verify `X-Firebase-AppCheck` header present

---

### 13. Performance Validation

- [ ] **Page load time acceptable**
  - Use browser DevTools or WebPageTest
  - Expected: First Contentful Paint < 2s

- [ ] **No console errors**
  - Open browser console
  - Navigate through all pages
  - Expected: No errors (warnings okay)

- [ ] **Bundle sizes correct**
  - Check Network tab
  - Expected: Total JS < 2MB (gzipped < 500KB)

---

## Post-Deployment Actions

### 14. Monitoring (First 15 Minutes)

- [ ] **Watch Sentry dashboard**
  - https://sentry.io/[org]/sierra-painting-prod
  - Expected: No new error spikes

- [ ] **Monitor Firebase Analytics**
  - Firebase Console > Analytics
  - Expected: Events flowing normally

- [ ] **Check user reports**
  - Monitor support channels
  - Expected: No major complaints

---

### 15. Communication

- [ ] **Announce completion**
      Post in #production-alerts:

  ```
  ✅ Production deployment complete
  Version: [VERSION]
  Deployed: [TIMESTAMP]
  Changes: [BRIEF SUMMARY]
  Monitoring: Active
  ```

- [ ] **Update status page**
  - Mark deployment as complete
  - Clear any maintenance notices

---

### 16. Documentation

- [ ] **Tag release**

  ```bash
  git tag -a v[VERSION] -m "Production release [VERSION]"
  git push origin v[VERSION]
  ```

- [ ] **Update changelog**
  - Document changes in CHANGELOG.md
  - Include version number and date

- [ ] **Create release notes**
  - GitHub > Releases > New Release
  - Include changes and known issues

---

## Emergency Procedures

### If Deployment Fails

- [ ] **Check error messages**
  - Review Firebase deployment logs
  - Check build errors

- [ ] **Verify Firebase project**

  ```bash
  firebase use
  ```

  Expected: `sierra-painting-prod`

- [ ] **Check permissions**

  ```bash
  firebase login --reauth
  ```

- [ ] **Contact support**
  - Firebase Support: https://firebase.google.com/support
  - Team lead: [CONTACT]

---

### If Site is Broken After Deployment

- [ ] **Quick rollback**

  ```bash
  firebase hosting:rollback
  ```

- [ ] **Verify rollback**

  ```bash
  curl -I https://yourcompany.app
  ```

  Expected: HTTP 200

- [ ] **Notify team**
      Post in #production-alerts:

  ```
  🚨 Emergency rollback executed
  Reason: [ISSUE DESCRIPTION]
  Status: Site restored
  Next: Root cause analysis
  ```

- [ ] **Follow ROLLBACK_GUIDE.md**
  - See `docs/ROLLBACK_GUIDE.md` for detailed procedures

---

## Long-Term Monitoring

### Daily (First 3 Days)

- [ ] Check Sentry for new errors
- [ ] Review Firebase Analytics
- [ ] Monitor uptime status
- [ ] Check user feedback

### Weekly

- [ ] Review performance metrics
- [ ] Check dependency updates
- [ ] Audit user feedback
- [ ] Verify backups running

### Monthly

- [ ] Security audit (`npm audit`)
- [ ] Performance benchmarks
- [ ] Backup restore test
- [ ] SSL certificate check

---

## Checklist Notes

**Before using this checklist:**

- Print or open in split screen
- Check off items as you complete them
- Don't skip steps (they're all important!)
- If unsure, ask for help

**After deployment:**

- Save completed checklist with date
- Note any issues or improvements
- Update checklist if needed

---

## Quick Reference

### Key Commands

```bash
# Pre-flight
npm run type-check && npm run lint && npm test -- --run

# Build
npm run build

# Deploy (automated)
./scripts/production-deploy.sh

# Deploy (manual)
firebase use production && firebase deploy

# Rollback
firebase hosting:rollback

# Verify
curl -I https://yourcompany.app
```

### Important URLs

- **Production**: https://yourcompany.app
- **Firebase Console**: https://console.firebase.google.com/project/sierra-painting-prod
- **Sentry**: https://sentry.io/[org]/sierra-painting-prod
- **GitHub**: https://github.com/[org]/sierra-painting-react

### Support Contacts

- **On-Call Engineer**: Check PagerDuty
- **Tech Lead**: [Phone/Email]
- **Firebase Support**: https://firebase.google.com/support
- **Slack**: #production-alerts

---

**Last Updated**: 2025-10-17
**Maintained By**: DevOps Team
**Review**: Before each deployment

✅ **Use this checklist for every production deployment to ensure nothing is missed.**
