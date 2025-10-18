# Phase 6: Advanced Backend Features Integration

**Status:** Planning Phase
**Start Date:** After V1.0.0 Production Launch
**Prerequisites:** Fully functional webapp on web and mobile

---

## 🎯 Overview

This phase adds enterprise-grade authentication, AI capabilities, and advanced Firebase features to enhance security, user experience, and automation.

---

## 📅 Implementation Timeline

### **Week 1-2: Enhanced Authentication**

**Goal:** Strengthen security and improve login UX

#### 1. Multi-Factor Authentication (MFA)

**Priority:** 🔴 CRITICAL
**Effort:** 2-3 days
**Business Value:** Protects admin/manager accounts from unauthorized access

**Implementation:**

```typescript
// Phase 6.1: MFA Enrollment
// File: src/features/auth/hooks/useMFA.ts

import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from 'firebase/auth';

export function useMFAEnrollment() {
  const [enrolling, setEnrolling] = useState(false);

  const enrollPhoneMFA = async (phoneNumber: string) => {
    setEnrolling(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user signed in');

      // Get MFA session
      const session = await multiFactor(user).getSession();

      // Initialize reCAPTCHA
      const recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        { size: 'invisible' },
        auth,
      );

      // Send verification code
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        { phoneNumber, session },
        recaptchaVerifier,
      );

      return verificationId;
    } catch (error) {
      logger.error('MFA enrollment failed', error);
      throw error;
    } finally {
      setEnrolling(false);
    }
  };

  const verifyAndEnroll = async (verificationId: string, code: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in');

    // Create credential from verification code
    const cred = PhoneAuthProvider.credential(verificationId, code);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

    // Enroll in MFA
    await multiFactor(user).enroll(multiFactorAssertion, 'Work Phone');

    logger.info('MFA enrolled successfully');
  };

  return { enrollPhoneMFA, verifyAndEnroll, enrolling };
}

// MFA Sign-In Resolver
export function useMFASignIn() {
  const resolveMFASignIn = async (resolver: MultiFactorResolver, verificationCode: string) => {
    const phoneInfoOptions = {
      multiFactorHint: resolver.hints[0],
      session: resolver.session,
    };

    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneInfoOptions,
      recaptchaVerifier,
    );

    const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

    return await resolver.resolveSignIn(multiFactorAssertion);
  };

  return { resolveMFASignIn };
}
```

**UI Components:**

- `src/features/auth/components/MFAEnrollmentDialog.tsx` - Enrollment flow
- `src/features/auth/components/MFAVerificationDialog.tsx` - Login verification
- `src/pages/settings/MFASettingsSection.tsx` - Manage enrolled devices

**Security Rules Update:**

```javascript
// firestore.rules - require MFA for sensitive operations
function hasMFA() {
  return request.auth.token.firebase.sign_in_second_factor != null;
}

// Require MFA for deleting estimates
match /estimates/{estimateId} {
  allow delete: if isAdmin()
                && belongsToCompany(resource.data.companyId)
                && hasMFA();
}
```

**Testing Checklist:**

- [ ] Enroll phone number for MFA
- [ ] Sign out and sign in with MFA
- [ ] Test MFA code resend
- [ ] Test backup codes
- [ ] Remove MFA enrollment
- [ ] Test admin-only MFA enforcement

---

#### 2. Google Sign-In (OAuth)

**Priority:** 🟠 HIGH
**Effort:** 1 day
**Business Value:** Faster onboarding, trusted authentication

**Implementation:**

```typescript
// Phase 6.1: Google OAuth
// File: src/features/auth/hooks/useGoogleAuth.ts

import { GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'firebase/auth';

export function useGoogleAuth() {
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      const result = await signInWithPopup(auth, provider);

      // Cloud Function will automatically set custom claims via trigger
      // Wait for claims to be set
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force token refresh to get new claims
      await result.user.getIdToken(true);

      logger.info('[Google Auth] Sign-in successful', {
        uid: result.user.uid,
        email: result.user.email,
      });

      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        logger.warn('[Google Auth] Popup closed by user');
        return null;
      }
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in');

    const provider = new GoogleAuthProvider();
    await linkWithPopup(user, provider);

    logger.info('[Google Auth] Account linked');
  };

  return { signInWithGoogle, linkGoogleAccount };
}
```

**UI Updates:**

```tsx
// src/pages/auth/LoginScreen.tsx
<Button onClick={() => signInWithGoogle()} variant="outline" className="w-full">
  <GoogleIcon className="mr-2" />
  Continue with Google
</Button>
```

**Firebase Console Setup:**

1. Enable Google sign-in provider
2. Add authorized domains
3. Configure OAuth consent screen

---

### **Week 3: Phone Authentication**

**Priority:** 🟡 MEDIUM
**Effort:** 2 days
**Business Value:** Mobile-first auth for field workers

**Implementation:**

```typescript
// Phase 6.2: Phone Auth
// File: src/features/auth/hooks/usePhoneAuth.ts

import { PhoneAuthProvider, signInWithCredential, RecaptchaVerifier } from 'firebase/auth';

export function usePhoneAuth() {
  const [verificationId, setVerificationId] = useState<string | null>(null);

  const sendVerificationCode = async (phoneNumber: string) => {
    // Initialize reCAPTCHA
    const recaptchaVerifier = new RecaptchaVerifier(
      'recaptcha-container',
      {
        size: 'normal',
        callback: () => {
          logger.debug('[Phone Auth] reCAPTCHA solved');
        },
      },
      auth,
    );

    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);

    setVerificationId(verificationId);
    return verificationId;
  };

  const verifyCode = async (code: string) => {
    if (!verificationId) throw new Error('No verification in progress');

    const credential = PhoneAuthProvider.credential(verificationId, code);
    const result = await signInWithCredential(auth, credential);

    logger.info('[Phone Auth] Sign-in successful');
    return result.user;
  };

  return { sendVerificationCode, verifyCode };
}
```

**Components:**

- `PhoneAuthScreen.tsx` - Phone number input + verification
- `VerificationCodeInput.tsx` - 6-digit code input component

**Cloud Function Update:**

```typescript
// functions/src/triggers/auth.ts
// Auto-create worker role for phone auth users

export const onPhoneAuthCreate = functions.auth.user().onCreate(async (user) => {
  if (user.phoneNumber && !user.email) {
    // Phone-only authentication = field worker
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'worker',
      companyId: await getCompanyIdForPhoneNumber(user.phoneNumber),
      updatedAt: Date.now(),
    });
  }
});
```

---

### **Week 4: Email Verification Enforcement**

**Priority:** 🟡 MEDIUM
**Effort:** 1 day

**Implementation:**

```typescript
// Phase 6.2: Email Verification
// File: src/features/auth/hooks/useEmailVerification.ts

export function useEmailVerification() {
  const sendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in');

    await sendEmailVerification(user, {
      url: `${window.location.origin}/dashboard`,
      handleCodeInApp: false,
    });

    toast.success('Verification email sent! Please check your inbox.');
  };

  const checkVerification = async () => {
    const user = auth.currentUser;
    if (!user) return false;

    await user.reload();
    return user.emailVerified;
  };

  return { sendVerificationEmail, checkVerification };
}
```

**Enforcement:**

```typescript
// src/lib/router.tsx
// Block unverified users from sensitive actions

function RequireEmailVerification({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user);

  if (user && !user.emailVerified && user.role === 'admin') {
    return <EmailVerificationRequired />;
  }

  return <>{children}</>;
}
```

---

## 🤖 **Month 2: AI/ML Integration**

### **Week 5-6: Gemini AI Integration**

**Priority:** 🟢 LOW (After core features stable)
**Effort:** 1-2 weeks
**Business Value:** Automation, time savings, improved accuracy

#### Use Cases

**1. Auto-Generate Invoice Descriptions**

```typescript
// Phase 6.3: AI Invoice Generation
// File: src/features/ai/hooks/useGeminiInvoice.ts

import { getFunctions, httpsCallable } from 'firebase/functions';

export function useGeminiInvoiceDescription() {
  const generateDescription = async (jobDetails: {
    type: string;
    squareFootage: number;
    rooms: string[];
    colors: string[];
    notes: string;
  }) => {
    const functions = getFunctions();
    const generateInvoice = httpsCallable(functions, 'gemini-generateInvoiceDescription');

    const result = await generateInvoice({ jobDetails });
    return result.data.description;
  };

  return { generateDescription };
}
```

**Cloud Function:**

```typescript
// functions/src/gemini/invoice-generator.ts

import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: 'sierra-painting-staging',
  location: 'us-central1',
});

const model = vertexAI.preview.getGenerativeModel({
  model: 'gemini-pro',
});

export const generateInvoiceDescription = functions.https.onCall(async (data, context) => {
  // Verify authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { jobDetails } = data;

  const prompt = `
    Generate a professional invoice description for a painting job:
    - Type: ${jobDetails.type}
    - Square Footage: ${jobDetails.squareFootage}
    - Rooms: ${jobDetails.rooms.join(', ')}
    - Colors: ${jobDetails.colors.join(', ')}
    - Notes: ${jobDetails.notes}

    Format: Professional, concise, 2-3 sentences.
  `;

  const result = await model.generateContent(prompt);
  const description = result.response.text();

  return { description };
});
```

**2. Estimate Generation from Photos**

```typescript
// Phase 6.3: AI Photo Estimation
// Upload job site photos → AI estimates square footage, rooms, materials

export const generateEstimateFromPhotos = functions.https.onCall(async (data, context) => {
  const { photoUrls } = data;

  const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-pro-vision',
  });

  const prompt = `
    Analyze these painting job site photos and estimate:
    1. Total square footage to be painted
    2. Number of rooms
    3. Surface condition (excellent/good/fair/poor)
    4. Recommended paint type
    5. Estimated labor hours

    Provide estimates in JSON format.
  `;

  const imageParts = await Promise.all(photoUrls.map((url) => fetchImageAsBase64(url)));

  const result = await model.generateContent([prompt, ...imageParts]);
  const estimate = JSON.parse(result.response.text());

  return { estimate };
});
```

**3. Smart Scheduling Suggestions**

```typescript
// Phase 6.3: AI Scheduling
// Optimize crew assignments based on job location, skills, availability

export const suggestOptimalSchedule = functions.https.onCall(async (data, context) => {
  const { jobs, crews, date } = data;

  const prompt = `
    Given these painting jobs and crew availability, suggest optimal assignments:

    Jobs: ${JSON.stringify(jobs, null, 2)}
    Crews: ${JSON.stringify(crews, null, 2)}
    Date: ${date}

    Optimize for:
    - Minimize travel time between jobs
    - Match crew skills to job requirements
    - Balance workload across crews
    - Respect crew availability

    Return JSON with job-to-crew assignments and reasoning.
  `;

  const result = await model.generateContent(prompt);
  const schedule = JSON.parse(result.response.text());

  return { schedule };
});
```

**4. Customer Communication Drafts**

```typescript
// Phase 6.3: AI Communication Assistant

export const draftCustomerEmail = functions.https.onCall(async (data, context) => {
  const { purpose, customerName, jobDetails, tone } = data;

  const prompt = `
    Draft a ${tone} email to ${customerName} for:
    Purpose: ${purpose}
    Job Details: ${JSON.stringify(jobDetails)}

    Include:
    - Professional greeting
    - Clear information
    - Next steps
    - Professional closing
  `;

  const result = await model.generateContent(prompt);
  return { emailDraft: result.response.text() };
});
```

---

## 🔌 **Month 2-3: Firebase Extensions**

### **Week 7: Essential Extensions**

#### 1. Trigger Email (Resend)

**Purpose:** Automated transactional emails

```yaml
# firebase.json
'extensions':
  {
    'resend-email':
      {
        'name': 'resend-email',
        'params':
          {
            'RESEND_API_KEY': '${param:RESEND_API_KEY}',
            'DEFAULT_FROM': 'noreply@sierrapainting.com',
          },
      },
  }
```

**Use Cases:**

- Invoice sent notifications
- Payment received confirmations
- Job assignment notifications
- Password reset emails

#### 2. Resize Images

**Purpose:** Optimize uploaded photos

```yaml
'storage-resize-images':
  {
    'name': 'storage-resize-images',
    'params':
      { 'IMG_SIZES': '200x200,800x800,1600x1600', 'IMG_BUCKET': '${param:PROJECT_ID}.appspot.com' },
  }
```

#### 3. Firestore Backups

**Purpose:** Automated daily backups

```yaml
'firestore-backup':
  {
    'name': 'firestore-backup',
    'params': { 'SCHEDULE': '0 2 * * *', 'BACKUP_BUCKET': '${param:PROJECT_ID}-backups' },
  }
```

---

## 📊 **Month 3+: Advanced Features**

### **Firebase App Check (Full Enforcement)**

**Currently:** Partially implemented, not enforced
**Goal:** Prevent unauthorized API access

```typescript
// lib/app-check.ts - Full enforcement

export async function initAppCheck() {
  if (IS_PRODUCTION) {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });

    // Enforce on all requests
    await appCheck.activate();
  }
}
```

### **Firebase Remote Config**

**Purpose:** Feature flags, A/B testing, gradual rollouts

```typescript
// lib/remote-config.ts

import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

export async function initRemoteConfig() {
  await fetchAndActivate(remoteConfig);
}

export function isFeatureEnabled(feature: string): boolean {
  return getValue(remoteConfig, feature).asBoolean();
}

// Usage
if (isFeatureEnabled('gemini_invoice_generation')) {
  // Show AI button
}
```

### **Firebase Performance Monitoring (Custom Traces)**

```typescript
// lib/performance.ts

import { trace } from 'firebase/performance';

export function traceInvoiceGeneration() {
  const t = trace(perf, 'invoice_generation');
  t.start();

  return {
    stop: () => t.stop(),
    setAttribute: (name: string, value: string) => t.putAttribute(name, value),
    incrementMetric: (name: string, value: number) => t.incrementMetric(name, value),
  };
}

// Usage
const traceObj = traceInvoiceGeneration();
traceObj.setAttribute('invoice_type', 'standard');
// ... generate invoice
traceObj.incrementMetric('line_items', lineItems.length);
traceObj.stop();
```

---

## ✅ **Implementation Checklist**

### **Phase 6.1: Enhanced Auth (Week 1-2)**

- [ ] Implement MFA enrollment flow
- [ ] Add MFA verification during sign-in
- [ ] Create MFA settings page
- [ ] Add Google OAuth sign-in
- [ ] Test account linking (email → Google)
- [ ] Update security rules for MFA enforcement

### **Phase 6.2: Mobile Auth (Week 3-4)**

- [ ] Implement phone authentication
- [ ] Create phone verification UI
- [ ] Enforce email verification for admins
- [ ] Add verification reminder banners
- [ ] Test phone + email linking

### **Phase 6.3: AI Integration (Month 2)**

- [ ] Enable Vertex AI in Firebase
- [ ] Implement invoice description generation
- [ ] Add photo-based estimate generation
- [ ] Create scheduling optimization
- [ ] Add customer email drafting
- [ ] Add AI usage cost monitoring

### **Phase 6.4: Extensions (Month 2-3)**

- [ ] Install Resend email extension
- [ ] Configure email templates
- [ ] Install image resize extension
- [ ] Set up automated backups
- [ ] Test all extensions in staging

### **Phase 6.5: Advanced Features (Month 3+)**

- [ ] Fully enforce App Check
- [ ] Configure Remote Config
- [ ] Add custom performance traces
- [ ] Set up A/B testing framework

---

## 🎯 **Success Metrics**

**Security:**

- 90%+ admin/manager accounts with MFA enabled
- 0 unauthorized access incidents

**User Experience:**

- 50%+ users sign in via Google OAuth
- < 30 seconds average sign-in time

**AI Automation:**

- 70%+ invoices use AI-generated descriptions
- 40% reduction in estimate creation time
- 30% improvement in scheduling efficiency

**Performance:**

- < 100ms added latency from App Check
- 99.9% uptime for Cloud Functions
- < $50/month Vertex AI costs

---

## 💰 **Cost Estimates**

| Feature             | Monthly Cost (Est.)           |
| ------------------- | ----------------------------- |
| MFA (SMS)           | $0.05/verification × 100 = $5 |
| Vertex AI (Gemini)  | ~$30-50 (based on usage)      |
| Firebase Extensions | $0 (included)                 |
| App Check           | $0 (free tier)                |
| Remote Config       | $0 (free tier)                |
| **Total**           | **$35-55/month**              |

---

## 📖 **Documentation**

Each feature will include:

- User guide (how to enable/use)
- Admin guide (how to configure)
- Developer guide (how to extend)
- Troubleshooting guide

---

**Next Review:** After V1.0.0 production launch
**Owner:** Development Team
**Stakeholders:** Admin Users, Field Workers, Management
