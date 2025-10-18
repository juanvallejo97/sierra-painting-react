# Local Testing Checklist

**Sierra Painting React - Pre-Deployment Manual Testing**

Date: 2025-10-18
Environment: Local Firebase Emulators

---

## ✅ Pre-Test Setup Status

### Automated Quality Gates

- [x] **TypeScript:** 0 errors (strict mode)
- [x] **ESLint:** 0 errors, 58 warnings (acceptable)
- [x] **Build:** Success (bundle: ~455KB gzipped)
- [x] **Unit Tests:** 138/138 passed
- [x] **Security Rules Tests:** 23/23 passed

### Environment Running

- [x] **Firebase Emulators:** Running on ports 8080, 9099, 9199
- [x] **Development Server:** Running on http://localhost:5173/
- [x] **Emulator UI:** http://127.0.0.1:4000/

---

## 🧪 Manual Testing Procedures

### 1. Initial Setup & Data Initialization

**Open Browser Console:**

```javascript
// Initialize Firebase with admin user and test data
initFirebase();

// Should see:
// "✅ Firebase initialized with admin user"
// Login: admin@test.com / Admin123!
```

**Expected Result:**

- [ ] Console shows successful initialization
- [ ] No errors in console
- [ ] Admin user created: `admin@test.com / Admin123!`

---

### 2. Authentication Testing

#### 2.1 Login Flow

1. Open http://localhost:5173/
2. Should redirect to `/login`
3. Enter credentials: `admin@test.com / Admin123!`
4. Click "Sign In"

**Expected Result:**

- [ ] Successful login
- [ ] Redirects to `/dashboard`
- [ ] No console errors
- [ ] Session persists on refresh

#### 2.2 Session Persistence

1. After logging in, refresh the page (F5)
2. Check if still logged in

**Expected Result:**

- [ ] Still logged in after refresh
- [ ] Stays on dashboard (doesn't redirect to login)
- [ ] User data loads correctly

#### 2.3 Logout

1. Click user avatar/menu
2. Click "Logout"

**Expected Result:**

- [ ] Logged out successfully
- [ ] Redirects to `/login`
- [ ] Cannot access protected routes

---

### 3. Dashboard Testing

**Login as Admin** (admin@test.com / Admin123!)

#### 3.1 Dashboard Loads

**Expected Result:**

- [ ] Dashboard displays without errors
- [ ] Statistics cards show data
- [ ] Recent activity visible
- [ ] Navigation menu functional

#### 3.2 Console Errors Check

Open DevTools Console (F12)

**Expected Result:**

- [ ] **NO red errors** (warnings OK)
- [ ] No `console.log` statements (should use logger)
- [ ] No Firebase permission errors

---

### 4. Invoice Management Testing

Navigate to **Invoices** page

#### 4.1 List Invoices

**Expected Result:**

- [ ] Invoice list loads
- [ ] Shows invoice number, customer, amount, status
- [ ] Search and filter work
- [ ] Pagination works (if applicable)

#### 4.2 Create New Invoice

1. Click "Create Invoice" button
2. Fill in form:
   - Customer name
   - Job details
   - Line items
   - Amount
3. Click "Create"

**Expected Result:**

- [ ] Dialog opens
- [ ] Form validation works
- [ ] Invoice created successfully
- [ ] Shows in list with auto-generated invoice number `INV-YYYYMM-XXXX`
- [ ] No console errors

#### 4.3 Record Partial Payment

1. Click on an unpaid invoice
2. Click "Record Payment"
3. Enter partial amount (< total)
4. Submit

**Expected Result:**

- [ ] Payment recorded
- [ ] Invoice shows "Partial" status
- [ ] Amount paid updates
- [ ] Payment history visible

#### 4.4 Record Full Payment

1. Record remaining amount
2. Submit

**Expected Result:**

- [ ] Invoice status changes to "Paid"
- [ ] Full payment history shown
- [ ] Total paid equals total amount

---

### 5. Job Management Testing

Navigate to **Jobs** page

#### 5.1 List Jobs

**Expected Result:**

- [ ] Job list loads
- [ ] Shows job details, status, workers
- [ ] Can filter by status
- [ ] No console errors

#### 5.2 Create New Job

1. Click "Create Job"
2. Fill in:
   - Job name
   - Customer
   - Address
   - Start/end dates
3. Submit

**Expected Result:**

- [ ] Job created successfully
- [ ] Appears in job list
- [ ] Can assign workers

#### 5.3 Assign Workers to Job

1. Click job
2. Click "Assign Workers"
3. Select workers
4. Submit

**Expected Result:**

- [ ] Workers assigned
- [ ] Shows on job details
- [ ] No permission errors

---

### 6. Employee Management Testing

Navigate to **Employees** page

#### 6.1 List Employees

**Expected Result:**

- [ ] Employee list loads
- [ ] Shows name, role, status
- [ ] Can search/filter

#### 6.2 Invite New Employee

1. Click "Invite Employee"
2. Enter email and role
3. Submit

**Expected Result:**

- [ ] Invitation created
- [ ] Employee shows as "pending"
- [ ] (Note: Email not actually sent in emulators)

#### 6.3 Edit Employee

1. Click employee
2. Click "Edit"
3. Change details
4. Save

**Expected Result:**

- [ ] Changes saved
- [ ] Updates visible immediately
- [ ] No errors

---

### 7. Estimates Testing

Navigate to **Estimates** page

#### 7.1 Create Estimate

1. Click "Create Estimate"
2. Fill in customer and line items
3. Submit

**Expected Result:**

- [ ] Estimate created
- [ ] Shows in list with status "pending"
- [ ] Can view details

#### 7.2 Approve Estimate (Admin)

1. Click estimate
2. Click "Approve"
3. Confirm

**Expected Result:**

- [ ] Status changes to "approved"
- [ ] Can convert to job/invoice
- [ ] Role permissions enforced (manager can't delete)

---

### 8. Time Clock Testing (Worker Flow)

#### 8.1 Create Worker Account

In browser console:

```javascript
// Create a worker user for testing
// (Or use existing test worker if available)
```

#### 8.2 Clock In/Out

1. Login as worker
2. Navigate to Time Clock
3. Click "Clock In"
4. Wait a moment
5. Click "Clock Out"

**Expected Result:**

- [ ] Clock in recorded with timestamp
- [ ] Clock out recorded
- [ ] Time entry shows duration
- [ ] Worker can view their own entries only

---

### 9. Role-Based Access Control (RBAC) Testing

#### 9.1 Admin Permissions

**Login as admin@test.com**

**Expected Result:**

- [ ] Can access all pages
- [ ] Can create/edit/delete all resources
- [ ] Can manage employees
- [ ] Can approve estimates
- [ ] Admin-only features visible

#### 9.2 Manager Permissions

**If manager account exists, login as manager**

**Expected Result:**

- [ ] Can create/edit invoices and jobs
- [ ] Cannot delete estimates (admin only)
- [ ] Cannot see payroll reports
- [ ] Manager-level features only

#### 9.3 Worker Permissions

**Login as worker**

**Expected Result:**

- [ ] Can only access time clock
- [ ] Can view assigned jobs
- [ ] Cannot create invoices/jobs
- [ ] Cannot access admin pages

---

### 10. Cross-Tenant Isolation Testing

#### 10.1 Verify Company Isolation

In browser console:

```javascript
// Check current user's companyId
auth.currentUser.companyId;

// Try to access data from another company (should fail)
```

**Expected Result:**

- [ ] All data scoped to current companyId
- [ ] Cannot access other companies' data
- [ ] Security rules enforce isolation

---

### 11. Offline Functionality Testing

#### 11.1 Network Disconnection

1. Open DevTools → Network tab
2. Set to "Offline"
3. Try to navigate/interact

**Expected Result:**

- [ ] Offline indicator appears
- [ ] Cached data still accessible
- [ ] Actions queued for sync when back online
- [ ] User-friendly error messages

#### 11.2 Reconnection

1. Set network back to "Online"
2. Check if queued actions sync

**Expected Result:**

- [ ] Offline indicator disappears
- [ ] Queued actions execute
- [ ] Data syncs correctly

---

### 12. Performance Testing

#### 12.1 Page Load Speed

**Open Performance tab in DevTools**

1. Refresh dashboard page
2. Check performance metrics

**Expected Result:**

- [ ] LCP < 2.5s
- [ ] FCP < 1.8s
- [ ] CLS < 0.1
- [ ] No layout shifts
- [ ] Images load quickly

#### 12.2 Bundle Size Verification

Check Network tab:

**Expected Result:**

- [ ] Initial JS bundle < 500KB
- [ ] Charts lazy loaded (not in initial bundle)
- [ ] PDF library lazy loaded
- [ ] Modern image formats (WebP/AVIF) used

---

### 13. Accessibility Testing

#### 13.1 Keyboard Navigation

1. Use Tab key to navigate
2. Press Enter/Space on buttons
3. Use arrow keys in dropdowns

**Expected Result:**

- [ ] Can navigate entire app with keyboard
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Logical tab order

#### 13.2 Screen Reader Support

**If screen reader available (NVDA, JAWS, VoiceOver)**

**Expected Result:**

- [ ] All interactive elements announced
- [ ] Forms have proper labels
- [ ] Error messages read aloud
- [ ] Navigation landmarks present

---

### 14. Mobile Responsiveness Testing

#### 14.1 Mobile View

**Open DevTools → Toggle Device Toolbar**

Test on:

- [ ] iPhone 12 Pro (390x844)
- [ ] iPad (768x1024)
- [ ] Android (360x640)

**Expected Result:**

- [ ] Layout adapts to screen size
- [ ] No horizontal scrolling
- [ ] Touch targets adequate size (44x44px min)
- [ ] Navigation menu works on mobile

---

### 15. Error Handling Testing

#### 15.1 Form Validation

1. Try to submit empty forms
2. Enter invalid data (bad email, negative numbers)

**Expected Result:**

- [ ] Validation errors shown
- [ ] User-friendly error messages
- [ ] Form doesn't submit with errors
- [ ] Error messages clear

#### 15.2 Network Errors

**Simulate by going offline mid-operation**

**Expected Result:**

- [ ] Error caught gracefully
- [ ] User-friendly error message
- [ ] Retry option available
- [ ] No app crash

---

### 16. Browser Console Final Check

**Open DevTools Console (F12)**

**Expected Result:**

- [ ] **ZERO red errors**
- [ ] No Firebase permission denied errors
- [ ] No React warnings
- [ ] No `console.log` statements (production logger only)
- [ ] Web Vitals metrics logged (debug mode)

---

## 📝 Testing Results Summary

### Critical Issues Found

```
List any blocking issues found:
- Issue 1: [Description]
- Issue 2: [Description]
```

### Minor Issues Found

```
List any non-blocking issues:
- Issue 1: [Description]
- Issue 2: [Description]
```

### Performance Metrics

```
LCP: _____ ms (target: < 2500ms)
FCP: _____ ms (target: < 1800ms)
CLS: _____ (target: < 0.1)
Bundle Size: _____ KB (target: < 500KB)
```

### Browser Tested

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Test Duration

Start Time: **\_**
End Time: **\_**
Total Duration: **\_** minutes

---

## ✅ Sign-Off

**Tester Name:** ********\_********
**Date:** ********\_********
**Status:** ☐ Pass ☐ Fail ☐ Pass with Minor Issues

**Recommendation:**
☐ **READY for staging deployment**
☐ **NOT READY** - Critical issues must be fixed first

**Comments:**

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 🚀 Next Steps

If all tests pass:

1. **Deploy to Staging Preview:**

   ```bash
   npm run deploy:preview
   ```

2. **Repeat testing on staging:**
   - Use preview URL
   - Test with real Firebase (not emulators)
   - Verify production-like behavior

3. **Complete Go/No-Go Checklist:**
   - Open `GO_NO_GO_CHECKLIST.md`
   - Obtain 3 signatures
   - Proceed to production if approved

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-18
