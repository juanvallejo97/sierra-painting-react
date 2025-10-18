# Firebase Setup Guide

This guide explains how to set up and use Firebase in the Sierra Painting React application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development with Emulators](#development-with-emulators)
3. [Production Deployment](#production-deployment)
4. [Security Rules](#security-rules)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created at [Firebase Console](https://console.firebase.google.com)

### Initial Setup

1. **Login to Firebase:**

   ```bash
   npm run firebase:login
   ```

2. **Deploy Security Rules** (REQUIRED - fixes permission errors):

   ```bash
   npm run firebase:deploy:rules
   ```

   This deploys the Firestore and Storage security rules to your Firebase project. Without this step, all database operations will fail with "permission-denied" errors.

3. **Start Development Server:**

   **Option A: Connect to Firebase Production/Staging**

   ```bash
   # Make sure .env has VITE_USE_FIREBASE_EMULATORS=false
   npm run dev
   ```

   **Option B: Use Local Firebase Emulators** (Recommended)

   ```bash
   # Terminal 1 - Start Firebase Emulators
   npm run emulators

   # Terminal 2 - Start Vite dev server with emulator config
   # Make sure .env.local has VITE_USE_FIREBASE_EMULATORS=true
   npm run dev
   ```

4. **Initialize Test Data:**

   Open your browser console and run:

   ```javascript
   initFirebase();
   ```

   This will:
   - Create an admin user (admin@test.com / Admin123!)
   - Create a test company
   - Seed sample jobs, invoices, and estimates

5. **Sign In:**
   - Email: `admin@test.com`
   - Password: `Admin123!`

---

## Development with Emulators

### Why Use Emulators?

- **Faster development**: No network latency
- **Safe testing**: Changes don't affect production data
- **Free**: No Firebase quota consumption
- **Offline**: Work without internet connection

### Starting Emulators

```bash
npm run emulators
```

This starts:

- **Firestore Emulator** on port 8080
- **Auth Emulator** on port 9099
- **Storage Emulator** on port 9199
- **Emulator UI** on port 4000 (http://localhost:4000)

### Emulator UI

The Emulator UI provides:

- Real-time database viewer
- User account management
- Request logs
- Data export/import

Access it at: http://localhost:4000

### Persisting Emulator Data

**Export data:**

```bash
npm run emulators:export
```

This saves emulator data to `./firebase-data/`

**Import data on startup:**

```bash
npm run emulators:import
```

This loads previously exported data when starting emulators.

### Switching Between Emulators and Production

Edit `.env.local`:

```bash
# Use emulators
VITE_USE_FIREBASE_EMULATORS=true

# Use production/staging
VITE_USE_FIREBASE_EMULATORS=false
```

---

## Production Deployment

### 1. Deploy Security Rules Only

```bash
npm run firebase:deploy:rules
```

Deploys:

- `firestore.rules` - Database security rules
- `storage.rules` - File storage security rules

### 2. Deploy Hosting Only

```bash
npm run firebase:deploy:hosting
```

Builds the app and deploys to Firebase Hosting.

### 3. Deploy Everything

```bash
npm run firebase:deploy
```

Deploys security rules, hosting, and any configured Cloud Functions.

---

## Security Rules

### Firestore Security Rules

Located in: `firestore.rules`

**Key Features:**

- **Multi-tenancy**: All data isolated by `companyId`
- **Role-based access control**: admin, manager, worker roles
- **Worker restrictions**: Workers can only see their assigned jobs and own time entries
- **Document validation**: Ensures required fields are present

**Collection Access:**

| Collection    | Read Access                 | Write Access              | Delete Access           |
| ------------- | --------------------------- | ------------------------- | ----------------------- |
| `users`       | Self + managers             | Self (limited) + admins   | Admins only             |
| `jobs`        | Assigned workers + managers | Managers only             | Admins only             |
| `invoices`    | Managers only               | Managers only             | Admins only             |
| `estimates`   | Managers only               | Managers only             | Admins only             |
| `timeEntries` | Self + managers             | Self (pending) + managers | Self (pending) + admins |

### Storage Security Rules

Located in: `storage.rules`

**Key Features:**

- **Company folders**: All files organized by `/{companyId}/...`
- **File type validation**: Only images and documents allowed
- **Size limits**: 10MB for images, 50MB for documents
- **User isolation**: Users can only access their company's files

**Folder Structure:**

```
/companies/{companyId}/
  ├── jobs/{jobId}/           - Job photos
  ├── invoices/{invoiceId}/   - Invoice receipts
  ├── estimates/{estimateId}/ - Estimate documents
  ├── users/{userId}/         - Profile photos
  └── timeEntries/{entryId}/  - Time entry attachments
```

### Testing Security Rules

After deploying rules, test with:

1. **Sign in as admin** and verify you can:
   - View all jobs, invoices, estimates
   - Create/update/delete any data
   - Manage users

2. **Create a worker account** and verify:
   - Can only see assigned jobs
   - Can create/update own time entries
   - Cannot access invoices or estimates

3. **Test cross-company isolation**:
   - Create a second company
   - Verify users cannot access other company's data

---

## Troubleshooting

### Permission Denied Errors

**Problem:** Getting "permission-denied" errors when accessing Firestore.

**Solutions:**

1. **Deploy security rules:**

   ```bash
   npm run firebase:deploy:rules
   ```

2. **Check user has companyId:**
   Open browser console:

   ```javascript
   auth.currentUser;
   ```

   Verify the user document in Firestore has a `companyId` field.

3. **Verify you're signed in:**

   ```javascript
   auth.currentUser; // Should not be null
   ```

4. **Check Firebase console:**
   - Go to Firestore Rules tab
   - Verify rules are published
   - Check the rules match `firestore.rules`

### Emulator Connection Issues

**Problem:** App not connecting to emulators.

**Solutions:**

1. **Verify emulators are running:**

   ```bash
   npm run emulators
   ```

2. **Check .env.local:**

   ```bash
   VITE_USE_FIREBASE_EMULATORS=true
   VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
   ```

3. **Clear browser cache and reload**

4. **Check console for connection messages:**
   You should see: "🔥 Connecting to Firebase Emulators..."

### Data Not Appearing

**Problem:** Jobs/Invoices/Estimates showing as empty.

**Solutions:**

1. **Initialize test data:**

   ```javascript
   initFirebase(); // In browser console
   ```

2. **Check user's companyId:**
   Make sure user document has `companyId` set.

3. **Verify security rules are deployed:**

   ```bash
   npm run firebase:deploy:rules
   ```

4. **Check Firestore console/Emulator UI:**
   Verify documents exist and have `companyId` field.

### Build Errors

**Problem:** TypeScript or build errors related to Firebase.

**Solutions:**

1. **Clear node_modules and reinstall:**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Update Firebase dependencies:**

   ```bash
   npm update firebase
   ```

3. **Check TypeScript version:**
   ```bash
   npm install typescript@~5.9.3
   ```

---

## Initialization Scripts

The following functions are available in the browser console during development:

### `initFirebase()`

Complete initialization: creates admin user, company, and seeds test data.

```javascript
initFirebase();
```

### `initAdmin(email, password, companyName)`

Creates only the admin user and company (no test data).

```javascript
initAdmin('admin@mycompany.com', 'MyPassword123!', 'My Company');
```

### `seedTestData(companyId)`

Seeds test data for an existing company.

```javascript
seedTestData('test-company-001');
```

---

## Environment Variables

### Required Variables

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Optional Variables

```bash
# Enable Firebase Emulators (set to 'true' for local dev)
VITE_USE_FIREBASE_EMULATORS=false

# Emulator host (usually 127.0.0.1)
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1

# API URL (if using Cloud Functions)
VITE_API_URL=http://localhost:5001/api
```

---

## NPM Scripts Reference

| Script                            | Description                         |
| --------------------------------- | ----------------------------------- |
| `npm run dev`                     | Start Vite dev server               |
| `npm run emulators`               | Start Firebase emulators            |
| `npm run firebase:login`          | Login to Firebase CLI               |
| `npm run firebase:deploy`         | Deploy everything (rules + hosting) |
| `npm run firebase:deploy:rules`   | Deploy only security rules          |
| `npm run firebase:deploy:hosting` | Deploy only hosting                 |
| `npm run emulators:export`        | Export emulator data to disk        |
| `npm run emulators:import`        | Start emulators with imported data  |

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [React Query Documentation](https://tanstack.com/query/latest)

---

## Support

If you encounter issues:

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review Firebase console error logs
3. Check browser console for detailed error messages
4. Verify all environment variables are set correctly
5. Ensure security rules are deployed

For permission errors, the most common solution is:

```bash
npm run firebase:deploy:rules
```
