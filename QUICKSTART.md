# Quick Start Guide - D'Sierra Painting React App

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
cd /home/j-p-v/AppDev/sierra-painting-react
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

App will run at: **http://localhost:5173**

---

## 🔐 Demo Login Credentials

The app currently uses **mock Firebase authentication** for development.

### Admin Access
- **Email:** `admin@test.com`
- **Password:** Any password (8+ characters)
- **Redirects to:** `/admin/home`

### Worker Access
- **Email:** `worker@test.com`
- **Password:** Any password (8+ characters)
- **Redirects to:** `/worker/home`

---

## 🎯 What to Test

### 1. Authentication Flow
1. Visit `http://localhost:5173`
2. Should redirect to `/login`
3. Try invalid email → See validation error
4. Try weak password (< 8 chars) → See validation error
5. Try 6+ failed attempts with same email → See rate limit error
6. Login with `admin@test.com` / `Test1234!` → Should redirect to admin dashboard

### 2. Admin Dashboard (`/admin/home`)
- View KPI cards (Revenue, Active Jobs, Pending Invoices, Active Workers)
- See skeleton loading states
- Click Quick Action buttons (will navigate to placeholder pages)
- View Recent Activity feed

### 3. Worker Timeclock (`/worker/home`)
- Click "Clock In" button
- See timer start counting
- **CRITICAL TEST:** Refresh the page → Timer should persist!
- Click "Clock Out" (with confirmation)
- Timer resets to 0:00

### 4. Navigation
- Click sidebar menu items
- Active route should be highlighted in red
- Try clicking between admin and worker routes (route guards should prevent)
- Click "Sign Out" → Should return to login

### 5. Route Guards
- When logged in as admin, try visiting `/worker/home` → Should redirect to `/admin/home`
- When logged in as worker, try visiting `/admin/home` → Should redirect to `/worker/home`
- When logged out, try visiting `/admin/home` → Should redirect to `/login`

---

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server (hot reload)

# Building
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run type-check       # TypeScript type checking
npm run lint             # Check for lint errors
npm run lint:fix         # Auto-fix lint errors
npm run format           # Format with Prettier

# Testing (TODO)
npm run test             # Run Vitest tests
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report
```

---

## 📂 Key Files to Explore

### Core Infrastructure
```
src/lib/auth-context.tsx      # Firebase authentication
src/lib/router.tsx             # Route guards
src/lib/validation.ts          # Form validation schemas
src/lib/rate-limiter.ts        # Brute force protection
src/store/auth-store.ts        # Zustand auth state
```

### Components
```
src/components/ui/             # All UI components
src/components/layout/AppLayout.tsx  # Main app shell
```

### Pages
```
src/pages/auth/LoginScreen.tsx       # Login page
src/pages/admin/AdminHomeScreen.tsx  # Admin dashboard
src/pages/worker/WorkerHomeScreen.tsx # Worker timeclock
```

### Hooks
```
src/hooks/use-timer-persistence.ts   # Timer hook (FIXED)
```

---

## 🔧 Connecting Real Firebase

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Create new project: "sierra-painting-dev"
3. Enable Authentication → Email/Password
4. Create Firestore database (start in test mode)

### 2. Get Firebase Credentials
1. Project Settings → General → Your apps
2. Click "Web app" (</> icon)
3. Register app: "sierra-painting-web"
4. Copy the config object

### 3. Update .env File
```bash
# Edit .env file
VITE_FIREBASE_API_KEY=AIzaSy... (your actual key)
VITE_FIREBASE_AUTH_DOMAIN=sierra-painting-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sierra-painting-dev
# ... rest of config
```

### 4. Create Test Users
1. Firebase Console → Authentication → Users
2. Add user: admin@test.com / Test1234!
3. Add user: worker@test.com / Test1234!

### 5. Set User Roles in Firestore
1. Firebase Console → Firestore Database
2. Create collection: `users`
3. Add document with ID matching the UID from Authentication:
```json
{
  "email": "admin@test.com",
  "displayName": "Admin User",
  "role": "admin",
  "companyId": "company_001",
  "createdAt": (timestamp),
  "updatedAt": (timestamp)
}
```

### 6. Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
# Login should now use real Firebase
```

---

## 🐛 Troubleshooting

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf dist .vite
npm run build
```

### TypeScript Errors
```bash
# Run type check to see all errors
npm run type-check
```

### Firebase Connection Issues
1. Check `.env` file has correct values
2. Check Firebase project is in Blaze plan (if using Cloud Functions)
3. Check browser console for CORS errors
4. Verify Firebase project has Authentication enabled

### Rate Limit Stuck
```bash
# Clear localStorage in browser DevTools:
localStorage.clear()
# Or just wait 15 minutes
```

---

## 📊 Project Status

### ✅ Phase 1 Complete (Security & Auth Foundation)
- Firebase authentication
- Input validation
- Rate limiting
- Route guards
- UI component system
- Admin dashboard
- Worker timeclock (timer bug FIXED)
- Design system

### 🚧 Next Steps (Phase 2)
- React Query data fetching
- Real-time KPI updates
- Activity feed with Firestore
- Remaining pages (Jobs, Invoices, Estimates, Employees)
- Unit tests
- E2E tests

---

## 💡 Tips

1. **Use the browser DevTools** to inspect Redux/Zustand state
2. **Check the Network tab** to see Firebase API calls
3. **Use React DevTools** to inspect component tree
4. **localStorage** is used for auth persistence - check Application tab
5. **Hot reload** is enabled - changes appear instantly

---

## 🆘 Need Help?

### Documentation
- See `IMPLEMENTATION.md` for full technical details
- See `README.md` for project overview
- Check `src/types/index.ts` for type definitions

### Firebase
- Firebase Auth Docs: https://firebase.google.com/docs/auth
- Firestore Docs: https://firebase.google.com/docs/firestore

### React
- React Docs: https://react.dev
- React Router: https://reactrouter.com
- Zustand: https://github.com/pmndrs/zustand
- React Hook Form: https://react-hook-form.com
- Zod: https://zod.dev

---

**Ready to start building!** 🎉
