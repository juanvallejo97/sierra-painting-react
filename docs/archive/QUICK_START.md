# Quick Start Guide - Sierra Painting React

## Fix Permission Errors (MOST IMPORTANT)

If you're seeing "permission-denied" or "Missing or insufficient permissions" errors:

```bash
# Deploy security rules to Firebase
npm run firebase:deploy:rules
```

This is the #1 cause of issues. Security rules MUST be deployed before the app will work.

---

## Development Setup

### Option 1: Use Firebase Emulators (Recommended)

```bash
# Terminal 1 - Start emulators
npm run emulators

# Terminal 2 - Start dev server
# Make sure .env.local has: VITE_USE_FIREBASE_EMULATORS=true
npm run dev

# Browser console - Initialize test data
initFirebase()

# Sign in
# Email: admin@test.com
# Password: Admin123!
```

### Option 2: Use Firebase Staging/Production

```bash
# Make sure .env has: VITE_USE_FIREBASE_EMULATORS=false

# Deploy rules first!
npm run firebase:deploy:rules

# Start dev server
npm run dev

# Browser console - Initialize test data (only once)
initFirebase()

# Sign in
# Email: admin@test.com
# Password: Admin123!
```

---

## Common Commands

```bash
# Development
npm run dev                      # Start Vite dev server
npm run emulators                # Start Firebase emulators
npm run emulators:import         # Start emulators with saved data

# Firebase
npm run firebase:login           # Login to Firebase CLI
npm run firebase:deploy:rules    # Deploy security rules (FIX PERMISSION ERRORS)
npm run firebase:deploy:hosting  # Deploy app to Firebase Hosting
npm run firebase:deploy          # Deploy everything

# Testing & Build
npm run build                    # Build for production
npm run preview                  # Preview production build
npm test                         # Run tests
npm run lint                     # Lint code
```

---

## Browser Console Utilities

```javascript
// Complete setup: admin user + company + test data
initFirebase();

// Create admin user only
initAdmin('admin@test.com', 'Password123!', 'Company Name');

// Seed test data only
seedTestData('test-company-001');

// Seed test company (legacy function)
seedTestCompany();
```

---

## File Structure

```
src/
├── components/          # UI components
│   ├── dialogs/        # Modal dialogs
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
│   └── firebase/       # Firebase data hooks
├── lib/                # Core libraries
│   ├── firebase.ts     # Firebase initialization
│   ├── auth-context.tsx # Authentication context
│   └── router.tsx      # App routing
├── pages/              # Page components
│   ├── auth/           # Auth pages (login, signup)
│   └── *.Screen.tsx    # Main app screens
├── schemas/            # Zod validation schemas
└── utils/              # Utility functions
    ├── init-firebase.ts    # Firebase initialization
    └── seed-test-data.ts   # Test data seeding

Root Files:
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
├── firestore.indexes.json  # Database indexes
├── firebase.json           # Firebase config
├── .env                    # Environment variables (staging/prod)
└── .env.local              # Environment variables (local dev)
```

---

## Troubleshooting

### "permission-denied" errors

```bash
npm run firebase:deploy:rules
```

### Emulators not connecting

1. Check emulators are running: `npm run emulators`
2. Verify `.env.local` has: `VITE_USE_FIREBASE_EMULATORS=true`
3. Reload browser

### No data showing

```javascript
// In browser console
initFirebase();
```

### Firebase login issues

```bash
firebase logout
firebase login
```

---

## Environment Variables

### .env (staging/production)

```bash
VITE_USE_FIREBASE_EMULATORS=false
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### .env.local (development with emulators)

```bash
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
# ... same Firebase config as above
```

---

## Need More Help?

See `FIREBASE_SETUP.md` for detailed documentation.
