# Firebase Backend Connection Troubleshooting Guide

## Quick Fix: Missing companyId Issue

If you're seeing errors like "Failed to create job" or "Error loading admin@test.com", it means your user document is missing the `companyId` field. Follow these steps:

### Step 1: Check Current User Status

1. Open your browser's developer console (F12 or Cmd+Option+I)
2. Run this command:

```javascript
checkUserStatus();
```

You should see output showing your user information. If `Company ID` shows `❌ MISSING`, proceed to step 2.

### Step 2: Fix the Missing companyId

Run this command in the console:

```javascript
fixUserCompanyId();
```

You should see:

```
✅ Added companyId to user: test-company-001
🔄 Please reload the page for changes to take effect
```

### Step 3: Reload and Verify

1. Refresh your browser page (F5 or Cmd+R)
2. Try creating a job, invoice, or other data
3. If issues persist, run `checkUserStatus()` again to verify the fix

## Complete Reset and Reinitialization

If you need to completely reset your Firebase data:

### Option 1: Reset Data Only (Keeps User Account)

```javascript
resetAndReinitialize();
```

This will:

- Add missing companyId to your user
- Seed fresh test data (jobs, invoices, estimates)

### Option 2: Complete Fresh Start

1. Stop the emulators if running (Ctrl+C in terminal)
2. Delete emulator data:

```bash
rm -rf .firebase/
```

3. Start emulators again:

```bash
npm run emulators
```

4. Open browser console and run:

```javascript
initFirebase();
```

This creates:

- Admin user: `admin@test.com` / `Admin123!`
- Test company: `test-company-001`
- 3 sample jobs
- 2 sample invoices
- 1 sample estimate

## Common Issues and Solutions

### Issue: "User must belong to a company"

**Cause**: User document missing `companyId` field

**Solution**: Run `fixUserCompanyId()` in browser console

---

### Issue: "Permission denied" errors

**Cause**: Firestore security rules blocking access

**Diagnostic Steps**:

1. Check user status: `checkUserStatus()`
2. Verify user has a role (admin/manager/worker)
3. Verify user has a companyId
4. Check browser console for detailed error messages

**Solution**:

1. If missing companyId: Run `fixUserCompanyId()`
2. If wrong role: Update in Firebase Emulator UI (localhost:4000)
3. If security rules issue: Check `firestore.rules` file

---

### Issue: "Failed to create job/invoice"

**Cause 1**: Missing companyId on user document
**Solution**: Run `fixUserCompanyId()`

**Cause 2**: Security rules blocking write
**Solution**:

1. Verify you're signed in as admin
2. Check role in emulator UI (localhost:4000 → Authentication)
3. Ensure companyId matches between user and data

---

### Issue: Data not showing up

**Cause**: Query filtering by companyId but user doesn't have one

**Solution**:

1. Run `checkUserStatus()` to confirm issue
2. Run `fixUserCompanyId()` to fix
3. Reload page

---

### Issue: "Unsupported field value: undefined"

**Cause**: Trying to write undefined values to Firestore

**Solution**: This has been fixed in the latest code. If you still see this:

1. Clear your browser cache
2. Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that you have the latest code

## Emulator UI Access

Access the Firebase Emulator UI at: http://localhost:4000

Here you can:

- View and edit user documents
- Check authentication status
- Browse Firestore data
- Manually update fields
- Monitor requests and errors

### Fixing User Role in Emulator UI

1. Go to http://localhost:4000
2. Click "Firestore" tab
3. Navigate to `users` collection
4. Click on your user document
5. Edit the `role` field (should be "admin" for full access)
6. Edit the `companyId` field (should be "test-company-001")
7. Save changes
8. Reload your app

## Diagnostic Commands (Browser Console)

All these commands are automatically available in the browser console:

### `checkUserStatus()`

Shows current user authentication status, role, and companyId

### `fixUserCompanyId()`

Adds companyId to current user if missing

### `resetAndReinitialize()`

Fixes user companyId and reseeds all test data

### `initFirebase()`

Complete initialization: creates admin user, company, and seeds data

### `seedTestData()`

Seeds test data only (jobs, invoices, estimates)

## Security Rules Overview

### User Access Patterns

**Admin**:

- Can read/write all data in their company
- Can create/update/delete users
- Can assign companyId to users

**Manager**:

- Can read/write jobs, invoices, estimates in their company
- Can read all users in their company
- Cannot create/delete users

**Worker**:

- Can read only jobs they're assigned to
- Can read/write their own time entries
- Cannot access invoices or estimates

### Company Isolation

All data is scoped by `companyId`:

- Users can only see data from their company
- Security rules enforce company boundaries
- Cross-company access is blocked

## Testing the Complete Flow

### Test 1: User Creation and Login

1. Run `initFirebase()` in console
2. Note the credentials (admin@test.com / Admin123!)
3. Sign out if signed in
4. Sign in with the admin credentials
5. Verify you see the dashboard

### Test 2: Data Access

1. Sign in as admin
2. Navigate to Jobs screen
3. Should see 3 test jobs
4. Navigate to Invoices screen
5. Should see 2 test invoices

### Test 3: Data Creation

1. Click "New Job" button
2. Fill in job details
3. Click Create
4. Should see new job in list (no errors)

### Test 4: Company Isolation

1. Run `checkUserStatus()` - note your companyId
2. Create a job
3. Check Firestore (emulator UI)
4. Verify job has same companyId as user

## Environment Check

### Required Files

Ensure these files exist:

- `firestore.rules` - Security rules for Firestore
- `storage.rules` - Security rules for Storage
- `firebase.json` - Firebase configuration
- `.env.local` - Should have `VITE_USE_FIREBASE_EMULATORS=true`

### Required Environment Variables

In `.env.local`:

```
VITE_USE_FIREBASE_EMULATORS=true
```

### Emulators Running

Check that these are running:

```
✅ Auth Emulator: http://localhost:9099
✅ Firestore Emulator: http://localhost:8080
✅ Storage Emulator: http://localhost:9199
✅ Emulator UI: http://localhost:4000
```

## Getting Help

### Browser Console Logs

Always check the browser console (F12) for detailed error messages. The app logs:

- User authentication changes
- Data fetch attempts
- Permission errors
- Missing field warnings

### Firebase Emulator Logs

Check the terminal where emulators are running for:

- Security rule evaluations
- Permission denials
- Query errors

### Network Tab

In browser DevTools → Network tab:

- Filter by "firestore"
- Check for failed requests (red)
- Click request to see response details
- Look for permission-denied or not-found errors

## Known Issues

### Issue: User Created Without companyId

**Fixed In**: Latest version
**Workaround**: Run `fixUserCompanyId()`

### Issue: Circular Dependency in Security Rules

**Status**: Fixed
**Solution**: Rules now check if user document exists before reading

### Issue: Auth Context Trying to Save Undefined Values

**Status**: Fixed
**Solution**: Fields are now filtered before writing to Firestore

## Next Steps After Fix

Once you've fixed the companyId issue:

1. ✅ User can sign in successfully
2. ✅ User can see dashboard
3. ✅ User can view jobs/invoices/estimates
4. ✅ User can create new jobs/invoices/estimates
5. ✅ Data is properly scoped to company
6. ✅ Security rules enforce access control

The application should now be fully functional!
