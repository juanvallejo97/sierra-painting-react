# Firebase App Check Setup Guide

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [What is Firebase App Check?](#what-is-firebase-app-check)
3. [Setup Instructions](#setup-instructions)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Enforcement](#enforcement)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Firebase App Check protects your backend resources (Firestore, Storage, Cloud Functions) from abuse by:
- ✅ Verifying requests come from your authentic app
- ✅ Blocking requests from unauthorized clients
- ✅ Preventing abuse from bots and scrapers
- ✅ Rate limiting suspicious traffic

**Implementation**: ✅ Complete
- **Provider**: reCAPTCHA v3 (web)
- **Auto-refresh**: Enabled
- **Enforcement**: Optional (configurable per service)

---

## What is Firebase App Check?

### How It Works

```
┌─────────────┐
│  Your App   │
│ (Browser)   │
└──────┬──────┘
       │
       │ 1. Request App Check token
       ▼
┌─────────────────┐
│   reCAPTCHA v3  │ 2. Verify user is human
│   (Google)      │    (invisible challenge)
└──────┬──────────┘
       │
       │ 3. Issue token
       ▼
┌─────────────┐
│  Your App   │ 4. Include token in requests
└──────┬──────┘
       │
       │ 5. Request + App Check token
       ▼
┌─────────────────────┐
│  Firebase Backend   │ 6. Verify token
│  (Firestore, etc)   │ 7. Accept/Reject request
└─────────────────────┘
```

### Benefits

1. **Prevent Abuse**: Block unauthorized access to your data
2. **No User Friction**: reCAPTCHA v3 works invisibly (no puzzles!)
3. **Rate Limiting**: Automatic throttling of suspicious requests
4. **Cost Savings**: Prevent excessive API usage from bots
5. **Security Layer**: Additional protection beyond Auth rules

---

## Setup Instructions

### Step 1: Get reCAPTCHA v3 Site Key

1. **Go to**: [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)

2. **Create a new site**:
   - Label: `Sierra Painting React - Production` (or your app name)
   - reCAPTCHA type: **reCAPTCHA v3**
   - Domains:
     - `localhost` (for development)
     - Your production domain (e.g., `sierra-painting.web.app`)

3. **Copy the Site Key** (starts with `6Le...`)

### Step 2: Register App in Firebase Console

1. **Go to**: [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **App Check** (in left sidebar)
4. Click **Get started**
5. **Register your web app**:
   - Select your web app
   - Provider: **reCAPTCHA v3**
   - Paste your reCAPTCHA site key
   - Click **Save**

### Step 3: Configure Environment Variables

Add to `.env`:

```bash
# Production (.env.production)
VITE_RECAPTCHA_SITE_KEY=6Le...your-site-key-here

# Development (.env.development)
VITE_RECAPTCHA_SITE_KEY=6Le...your-dev-site-key-here
VITE_APPCHECK_DEBUG_TOKEN=your-debug-token-here
```

### Step 4: Get Debug Token (Development Only)

Debug tokens allow testing without reCAPTCHA in development:

1. Go to **Firebase Console** > **App Check** > **Apps**
2. Find your web app
3. Click **Manage debug tokens**
4. Click **Add debug token**
5. Give it a name (e.g., "Local Development")
6. **Copy the token**
7. Add to `.env.development`:
   ```bash
   VITE_APPCHECK_DEBUG_TOKEN=your-debug-token-here
   ```

---

## Configuration

### Application Setup

App Check is automatically initialized in `main.tsx`:

```typescript
import { initAppCheck } from './lib/app-check';

// Initialize App Check with reCAPTCHA v3
initAppCheck().catch((error) => {
  console.error('[App Check] Failed to initialize:', error);
});
```

### Firestore Integration

App Check tokens are automatically included in all Firestore requests:

```typescript
// No changes needed - Firebase SDK handles this automatically!
const jobs = await getDocs(collection(db, 'jobs'));
// Request includes App Check token header
```

### Storage Integration

Same for Storage requests:

```typescript
const storageRef = ref(storage, 'images/job-photo.jpg');
await uploadBytes(storageRef, file);
// Request includes App Check token header
```

### Manual Token Retrieval

For custom API calls:

```typescript
import { getAppCheckToken } from './lib/app-check';

const token = await getAppCheckToken();

fetch('/api/custom-endpoint', {
  headers: {
    'X-Firebase-AppCheck': token || '',
  },
});
```

---

## Testing

### Development Testing

With debug token configured, test that App Check is working:

```typescript
import { debugAppCheckToken } from './lib/app-check';

// In browser console:
debugAppCheckToken();

// Output:
// [App Check] Token Info
//   Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
//   Token length: 1234
//   App Check enabled: true
```

### Test Scenarios

1. **With App Check enabled (normal mode)**:
   ```javascript
   // Should succeed
   const jobs = await getDocs(collection(db, 'jobs'));
   ```

2. **Without debug token (development)**:
   - Remove `VITE_APPCHECK_DEBUG_TOKEN` from `.env`
   - Restart dev server
   - Verify reCAPTCHA challenge works invisibly
   - Check Network tab for `appcheck` requests

3. **Monitor mode vs Enforce mode** (see [Enforcement](#enforcement))

### Browser DevTools

Check App Check tokens in Network tab:

1. Open DevTools > Network tab
2. Make a Firestore request
3. Check request headers for:
   ```
   X-Firebase-AppCheck: <token>
   ```

---

## Enforcement

### Monitor Mode (Recommended First)

Start in **Monitor mode** to collect metrics without blocking:

1. **Firebase Console** > **App Check**
2. Select service (Firestore, Storage, etc.)
3. Click **Enforce**
4. Select **Monitor** mode
5. Monitor for 1-2 weeks

**What it does**:
- ✅ Collects metrics on requests with/without tokens
- ✅ Allows all requests (no blocking)
- ✅ Shows potential impact of enforcement

### Enforce Mode (After Verification)

After verifying no legitimate traffic is affected:

1. **Review metrics** in Firebase Console
2. Verify close to 100% of requests have valid tokens
3. Switch to **Enforce** mode:
   - Firebase Console > App Check > Service
   - Change from **Monitor** to **Enforce**

**What it does**:
- ✅ Blocks requests without valid App Check tokens
- ✅ Protects backend from unauthorized access
- ❌ May block legitimate traffic if misconfigured

### Per-Service Configuration

Configure enforcement separately for each service:

| Service | Recommended Mode | Reason |
|---------|-----------------|---------|
| **Firestore** | Enforce | Most critical - contains business data |
| **Storage** | Monitor | May have public assets, review first |
| **Functions** | Enforce | Protects backend logic and APIs |

---

## Monitoring

### Firebase Console Metrics

View App Check metrics:

1. **Firebase Console** > **App Check** > **Metrics**
2. View:
   - Requests with valid tokens vs invalid/missing
   - Token verification success rate
   - Top violated services

### Custom Monitoring

Track App Check status in your app:

```typescript
import { isAppCheckEnabled, getAppCheckToken } from './lib/app-check';

// Check if App Check is enabled
if (!isAppCheckEnabled()) {
  console.warn('App Check not enabled - backend may be vulnerable');
}

// Monitor token refresh
try {
  const token = await getAppCheckToken(true); // Force refresh
  if (!token) {
    // Track App Check token failure
    trackEvent('app_check_token_failed');
  }
} catch (error) {
  // App Check error - send to Sentry
  captureException(error);
}
```

### Alerts

Set up alerts for App Check failures:

1. **Sentry**: Errors automatically sent (see `handleAppCheckError()`)
2. **Firebase**: Configure alerts in Firebase Console > Alerts
3. **Custom**: Use Cloud Functions to trigger alerts

---

## Troubleshooting

### Common Errors

#### 1. `app-check/fetch-status-error`

**Error**: Failed to fetch App Check token

**Causes**:
- reCAPTCHA site key is invalid
- Domain not registered in reCAPTCHA console
- Network issues

**Solutions**:
```bash
# 1. Verify site key is correct
echo $VITE_RECAPTCHA_SITE_KEY

# 2. Check reCAPTCHA console
# https://www.google.com/recaptcha/admin
# Verify domain is listed

# 3. Check browser console for reCAPTCHA errors
# Open DevTools > Console > Look for "recaptcha" errors
```

#### 2. `app-check/throttled`

**Error**: Too many token requests

**Causes**:
- Calling `getToken()` too frequently
- Loop causing repeated requests

**Solutions**:
```typescript
// ❌ Bad - repeatedly calling getToken
setInterval(() => {
  getAppCheckToken();
}, 1000);

// ✅ Good - let SDK auto-refresh
initializeAppCheck(app, {
  isTokenAutoRefreshEnabled: true, // SDK handles refresh
});
```

#### 3. `app-check/recaptcha-error`

**Error**: reCAPTCHA failed

**Causes**:
- Ad blockers or privacy extensions
- reCAPTCHA blocked by CSP
- Invalid site key

**Solutions**:
```bash
# 1. Disable ad blockers temporarily
# 2. Check Content-Security-Policy headers
# 3. Verify site key matches domain
```

#### 4. Requests Blocked (Enforce Mode)

**Error**: Firestore/Storage requests return 403

**Causes**:
- App Check not initialized
- Token expired or invalid
- Service enforcing App Check

**Solutions**:
```typescript
// 1. Check if App Check is initialized
import { isAppCheckEnabled } from './lib/app-check';
console.log('App Check enabled:', isAppCheckEnabled());

// 2. Try getting token manually
import { getAppCheckToken } from './lib/app-check';
const token = await getAppCheckToken(true); // Force refresh
console.log('Token:', token ? 'Valid' : 'Invalid');

// 3. Check Firebase Console enforcement settings
// Firebase Console > App Check > Service > Verify mode
```

### Debug Mode

Enable debug logging:

```typescript
// In browser console
import { debugAppCheckToken } from './lib/app-check';
debugAppCheckToken();
```

### Reset App Check

If App Check is in a bad state:

```bash
# 1. Clear browser storage
# DevTools > Application > Clear storage

# 2. Delete node_modules/.vite cache
rm -rf node_modules/.vite

# 3. Restart dev server
npm run dev
```

---

## Best Practices

### ✅ Do

- **Start with Monitor mode** - Verify no legitimate traffic is blocked
- **Use debug tokens in development** - Avoid reCAPTCHA friction
- **Enable auto-refresh** - Let SDK handle token lifecycle
- **Monitor metrics regularly** - Watch for unusual patterns
- **Test before enforcing** - Verify app works with enforcement

### ❌ Don't

- **Don't enforce immediately** - Start with Monitor mode first
- **Don't share debug tokens** - Keep them secret like API keys
- **Don't call `getToken()` frequently** - Use auto-refresh instead
- **Don't rely on App Check alone** - Still need Auth and security rules
- **Don't commit site keys** - Use environment variables

---

## Resources

- **Firebase App Check Docs**: https://firebase.google.com/docs/app-check
- **reCAPTCHA v3 Docs**: https://developers.google.com/recaptcha/docs/v3
- **reCAPTCHA Admin**: https://www.google.com/recaptcha/admin
- **Firebase Console**: https://console.firebase.google.com/

---

## Checklist

### Setup ✅
- [x] reCAPTCHA v3 site key obtained
- [x] App registered in Firebase Console
- [x] Environment variables configured
- [x] Debug token configured (development)
- [x] App Check initialized in app

### Testing ⏳
- [ ] App Check token generated successfully
- [ ] Firestore requests include App Check header
- [ ] Storage requests include App Check header
- [ ] Debug mode works in development
- [ ] Production works with reCAPTCHA v3

### Enforcement ⏳
- [ ] Monitor mode enabled (1-2 weeks)
- [ ] Metrics reviewed (>99% success rate)
- [ ] Legitimate traffic verified
- [ ] Enforce mode enabled (if ready)
- [ ] Alerts configured

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
