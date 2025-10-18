# Firebase App Check Deployment Guide

## Overview

Firebase App Check protects your backend resources (Firestore, Storage, Cloud Functions) from abuse by unauthorized clients and bots. It uses attestation providers to verify that requests come from your legitimate app.

**Status**: ✅ Implemented and ready for deployment
**Protection Level**: Bot abuse prevention, API abuse mitigation
**Implementation**: Monitor mode (ready to enforce in production)

---

## What's Implemented

### ✅ Client-Side (Web App)

- **App Check Initialization**: Automatic on app start (`src/main.tsx`)
- **reCAPTCHA v3 Integration**: Invisible captcha for legitimate users
- **Debug Token Support**: For local development without reCAPTCHA
- **Auto Token Refresh**: Automatic token renewal
- **Error Handling**: Graceful degradation with logging

**File**: `src/lib/app-check.ts`

### ✅ Server-Side (Cloud Functions)

- **App Check Middleware**: Verifies tokens on callable functions
- **Monitor Mode**: Logs violations without blocking (default)
- **Enforce Mode**: Rejects requests without valid tokens (production)
- **Security Layers**: App Check + Authentication + Authorization

**Files**:

- `functions/src/middleware/app-check.ts`
- `functions/src/triggers/auth.ts` (App Check enabled)
- `functions/src/migrations/backfill-claims.ts` (App Check enabled)

---

## Deployment Steps

### Phase 1: reCAPTCHA Setup (30 minutes)

1. **Create reCAPTCHA v3 Site Key**

   ```bash
   # Go to: https://console.cloud.google.com/security/recaptcha
   # Click "Create Key"
   ```

   **Configuration:**
   - Type: **reCAPTCHA v3**
   - Domains:
     - `localhost` (development)
     - `127.0.0.1` (development)
     - `your-staging-domain.web.app` (staging)
     - `your-production-domain.com` (production)

2. **Copy Site Key**
   - After creation, copy the **Site Key** (NOT Secret Key)
   - Save for next step

3. **Add to Environment Variables**

   ```bash
   # .env.local (development)
   VITE_RECAPTCHA_SITE_KEY=6Lc...your-site-key

   # .env.staging (staging)
   VITE_RECAPTCHA_SITE_KEY=6Lc...your-site-key

   # .env.production (production)
   VITE_RECAPTCHA_SITE_KEY=6Lc...your-site-key
   ```

---

### Phase 2: Firebase Console Setup (15 minutes)

1. **Enable App Check**

   ```
   Firebase Console > App Check > Get Started
   ```

2. **Register Your Web App**
   - Select your web app
   - Click "Register"

3. **Add reCAPTCHA v3 Provider**
   - Provider: reCAPTCHA v3
   - Site Key: (paste from Phase 1)
   - Save

4. **Get Debug Token** (for development)

   ```
   Firebase Console > App Check > Apps > Debug tokens
   Click "Add debug token"
   ```

   Add to `.env.local`:

   ```bash
   VITE_APPCHECK_DEBUG_TOKEN=your-debug-token-uuid
   ```

---

### Phase 3: Enable Services (10 minutes)

Enable App Check for each service:

#### 1. Firestore

```
Firebase Console > App Check > Firestore
Mode: Monitor (initially)
```

#### 2. Storage

```
Firebase Console > App Check > Storage
Mode: Monitor (initially)
```

#### 3. Cloud Functions

```
Firebase Console > App Check > Functions
Mode: Monitor (initially)
```

**⚠️ Important**: Start with **Monitor** mode to collect metrics without blocking traffic!

---

### Phase 4: Deploy Functions (10 minutes)

1. **Build Functions**

   ```bash
   cd functions
   npm run build
   ```

2. **Deploy to Firebase**

   ```bash
   firebase deploy --only functions
   ```

3. **Verify Deployment**

   ```bash
   firebase functions:log
   ```

   Look for: `[App Check] Initialized successfully`

---

### Phase 5: Deploy Web App (5 minutes)

1. **Build App**

   ```bash
   npm run build
   ```

2. **Test Locally** (with debug token)

   ```bash
   npm run dev
   ```

   Check console: `[App Check] Initialized successfully with reCAPTCHA v3`

3. **Deploy to Hosting**
   ```bash
   firebase deploy --only hosting
   ```

---

### Phase 6: Monitoring & Metrics (Ongoing)

#### Week 1-2: Monitor Mode

**Goal**: Collect baseline metrics without blocking users

1. **Check Metrics Daily**

   ```
   Firebase Console > App Check > Metrics
   ```

   Monitor:
   - Total requests
   - Verified requests
   - Rejected requests (should be 0 in monitor mode)
   - Token issuance rate

2. **Review Function Logs**

   ```bash
   firebase functions:log --only assignUserRole,backfillUserClaims
   ```

   Look for:
   - `[App Check] App Check verified` (good)
   - `[App Check] App Check verification failed` (investigate)

3. **Identify Legitimate Traffic**
   - Verify no legitimate users are flagged
   - Check for false positives
   - Review user feedback

#### After 2 Weeks: Switch to Enforce Mode

**Prerequisites:**

- ✅ No legitimate traffic blocked in monitor mode
- ✅ Metrics look healthy
- ✅ reCAPTCHA working for all users
- ✅ Debug tokens working in development

**Enable Enforcement:**

1. **Functions Environment Variable**

   ```bash
   firebase functions:config:set app_check.enforce=true
   firebase deploy --only functions
   ```

2. **Firebase Console Services**

   ```
   App Check > Firestore > Enforce
   App Check > Storage > Enforce
   App Check > Functions > Enforce
   ```

3. **Monitor Closely for 48 Hours**
   - Check error rates
   - Monitor user reports
   - Review App Check metrics
   - Be ready to rollback to Monitor mode if issues arise

---

## Verification Checklist

### ✅ Development Environment

- [ ] Debug token set in `.env.local`
- [ ] App Check initializes without errors
- [ ] Function calls succeed
- [ ] Console shows: `[App Check] Debug token configured`

### ✅ Staging Environment

- [ ] reCAPTCHA site key configured
- [ ] Staging domain added to reCAPTCHA
- [ ] App Check metrics showing requests
- [ ] No blocked legitimate traffic

### ✅ Production Environment

- [ ] Production site key configured
- [ ] Production domain in reCAPTCHA
- [ ] Monitor mode active (initially)
- [ ] Metrics dashboard accessible
- [ ] Rollback plan documented

---

## Troubleshooting

### Issue: "App Check verification failed"

**Client-Side Solutions:**

1. Check site key in `.env`
2. Verify domain registered in reCAPTCHA console
3. Check browser console for reCAPTCHA errors
4. Disable ad blockers/privacy extensions (for testing)

**Server-Side Solutions:**

1. Check if App Check enabled in Firebase Console
2. Review function logs for specific error
3. Verify function deployed with latest code
4. Check if enforce mode enabled too early

### Issue: reCAPTCHA not loading

**Solutions:**

1. Check CSP headers (should allow `www.google.com`, `www.gstatic.com`)
2. Verify network connectivity
3. Check for CORS issues
4. Review browser console errors

### Issue: High rejection rate

**Analysis:**

1. Check metrics: What % is being rejected?
2. Review logs: What error codes appear?
3. User feedback: Are real users affected?

**Actions:**

- If <5% rejection: Likely bots, continue
- If 5-20% rejection: Investigate patterns
- If >20% rejection: Rollback to Monitor mode immediately

---

## Rollback Procedure

If App Check causes issues in production:

### Immediate Rollback (5 minutes)

1. **Disable Enforcement in Console**

   ```
   Firebase Console > App Check > [Service] > Monitor
   ```

2. **Update Functions Config**

   ```bash
   firebase functions:config:unset app_check.enforce
   firebase deploy --only functions
   ```

3. **Monitor Recovery**
   - Check error rates drop
   - Verify user access restored
   - Review what went wrong

### Investigation (Post-Rollback)

1. Analyze metrics during enforcement
2. Review error logs for patterns
3. Identify affected user segments
4. Document root cause
5. Plan remediation

---

## Cost Impact

**reCAPTCHA v3 Pricing:**

- First 10,000 requests/month: **FREE**
- Additional requests: **$1 per 1,000 requests**

**Expected Cost (Estimates):**

- Small app (<10k MAU): **$0/month**
- Medium app (50k MAU): **~$40/month**
- Large app (500k MAU): **~$400/month**

**Firebase App Check:**

- **FREE** (no additional cost from Firebase)

---

## Security Benefits

### ✅ Protections Enabled

1. **Bot Abuse Prevention**
   - Automated scripts blocked
   - Credential stuffing attacks mitigated
   - API scraping prevented

2. **Unauthorized Client Blocking**
   - Cloned apps can't access backend
   - Reverse-engineered clients rejected
   - Third-party API abuse stopped

3. **Rate Limiting Enhancement**
   - Legitimate users not affected
   - Bots automatically throttled
   - DDoS mitigation improved

### Attack Scenarios Mitigated

| Attack Type         | Without App Check | With App Check  |
| ------------------- | ----------------- | --------------- |
| Credential Stuffing | ❌ Vulnerable     | ✅ Blocked      |
| API Scraping        | ❌ Vulnerable     | ✅ Blocked      |
| Cloned Apps         | ❌ Can access     | ✅ Rejected     |
| Bot Networks        | ❌ Can abuse      | ✅ Mitigated    |
| Automated Testing   | ❌ No protection  | ✅ Rate limited |

---

## Next Steps After Deployment

1. **Week 1**: Monitor metrics, no changes
2. **Week 2**: Continue monitoring, prepare for enforcement
3. **Week 3**: Switch to Enforce mode (if metrics good)
4. **Week 4**: Monitor enforcement, optimize rules
5. **Ongoing**: Regular metric reviews, adjust as needed

---

## Support Resources

- **Firebase Docs**: https://firebase.google.com/docs/app-check
- **reCAPTCHA Console**: https://console.cloud.google.com/security/recaptcha
- **Implementation Code**: `src/lib/app-check.ts`
- **Middleware Code**: `functions/src/middleware/app-check.ts`
- **Metrics Dashboard**: Firebase Console > App Check > Metrics

---

## Summary

**✅ Ready to Deploy:**

- Client: reCAPTCHA v3 integration complete
- Server: App Check middleware on all callable functions
- Mode: Monitor (safe default)
- Cost: Free for most apps
- Risk: Low (monitor mode doesn't block)

**⏭️ Next Phase:**
After 2 weeks of successful monitoring → Enable Enforce mode
