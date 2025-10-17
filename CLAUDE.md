# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sierra Painting React is a full-stack invoice and job management system for a painting company. It uses Firebase for backend services (Auth, Firestore, Storage) and React with TypeScript for the frontend. The app features multi-tenancy, role-based access control (admin, manager, worker, crew, staff), and real-time data synchronization.

## Common Development Tasks

### Running the Application

```bash
# Option 1: With Firebase Emulators (Recommended for development)
# Terminal 1
npm run emulators

# Terminal 2
npm run dev

# Browser console - Initialize test data (run once)
initFirebase()
# Login: admin@test.com / Admin123!

# Option 2: With Firebase Staging/Production
npm run firebase:deploy:rules  # Deploy security rules first (CRITICAL)
npm run dev
```

### Building and Deployment

```bash
npm run build                    # Production build
npm run firebase:deploy          # Deploy everything to Firebase
npm run firebase:deploy:rules    # Deploy only security rules (fixes permission errors)
npm run firebase:deploy:hosting  # Deploy only hosting
```

### Testing and Quality

```bash
npm test                         # Run Vitest tests
npm run lint                     # ESLint
npm run lint:fix                # Fix linting issues
npm run type-check              # TypeScript type checking
npm run format                  # Prettier formatting
```

### Database Management

```bash
# Browser console utilities (development only - loaded in main.tsx)
initFirebase()                  # Complete setup with admin user + test data
seedTestData('companyId')       # Seed sample data for testing
checkUserStatus()               # Debug current user state
fixUserCompanyId()             # Fix missing companyId on user
```

## Architecture

### State Management Pattern

- **Authentication**: Zustand store (`src/store/auth-store.ts`) with localStorage persistence
- **Data Fetching**: React Query with Firestore real-time listeners
- **Form State**: React Hook Form with Zod validation
- **Multi-tenancy**: All data scoped by `companyId` field

### Data Flow Example (Invoices)

1. Component (`InvoicesScreen.tsx`) calls custom hook
2. Hook (`useInvoices.ts`) sets up React Query with Firestore listener
3. Mutations trigger optimistic updates and cache invalidation
4. Security rules enforce company isolation at database level

### Route Protection Hierarchy

```
PublicRoute → Unauthenticated only (login, signup)
ProtectedRoute → Authenticated users
├── AdminRoute → role: admin/manager
├── WorkerRoute → role: worker/crew/staff
└── DashboardRouter → Redirects by role
```

### Key Patterns

**Firebase Integration**:

- Environment-based emulator connection (`VITE_USE_FIREBASE_EMULATORS`)
- Multi-tenant security rules in `firestore.rules`
- Automatic retry logic for emulator connections
- User document enrichment on authentication

**React Query Configuration**:

- Stale time: 2-5 minutes depending on data type
- Automatic refetch on window focus
- Retry: 2 attempts with 1-second delay
- Query keys include `companyId` for cache isolation

**Form Validation**:

- Zod schemas for all forms (`src/schemas/`)
- Currency parsing and formatting utilities
- Date validation (due dates must be >= today)
- Custom error messages for user-friendly feedback

## Critical Implementation Details

### Invoice Number Generation

Auto-generated format: `INV-YYYYMM-XXXX` where XXXX increments per month. Implementation in `src/hooks/useInvoices.ts:generateInvoiceNumber()`.

### Payment Recording

Supports partial payments with history tracking. Invoice status automatically updates to 'paid' when `amountPaid >= totalAmount`.

### User Creation Flow

1. Firebase Auth creates authentication record
2. Firestore document created in `users` collection
3. `companyId` assigned (critical for data access)
4. Role determines available routes and features

### Multi-Tenancy

Every collection document must have `companyId`. Security rules enforce this at the database level. Missing `companyId` causes permission errors.

## Current Limitations and TODOs

**High Priority** (from TODO.md):

- ViewInvoiceDialog component needed for full invoice details
- Email sending for employee invitations (placeholder only)
- Job detail view and status workflow
- Estimate creation and approval workflow

**Known Issues**:

- Employee invitation flow requires manual email sending
- No PDF generation for invoices yet
- File attachments not implemented

## Environment Configuration

**Required Firebase Config** (.env):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

**Development** (.env.local):

```
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
```

## Troubleshooting

**Permission Denied Errors**: Deploy security rules with `npm run firebase:deploy:rules`

**No Data Showing**: Run `initFirebase()` in browser console

**Emulator Connection Issues**: Verify `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local`

**User Missing CompanyId**: Run `fixUserCompanyId()` in browser console

## File Organization

Key directories to understand:

- `src/hooks/` - Business logic and Firebase operations
- `src/schemas/` - Form validation rules
- `src/lib/` - Core utilities (auth, firebase, routing)
- `src/pages/` - Screen components
- `src/components/dialogs/` - Modal forms for CRUD operations
- `firestore.rules` - Critical security configuration

## Enterprise Features

### Error Handling & Logging

The application uses a centralized error handling and logging system (`src/services/`):

```typescript
import { logger } from '@/services/logger';
import { ErrorHandler, BusinessError } from '@/services/errors';

// Set context for all logs
logger.setContext({ userId: user.uid, companyId: user.companyId });

// Log events
logger.info('Operation completed', { metadata });
logger.error('Operation failed', error, { context });

// Handle errors
try {
  // operation
} catch (error) {
  const { message } = ErrorHandler.handle(error);
  // Show user-friendly message
}

// Throw custom errors
throw new BusinessError('Cannot perform operation', 'INVALID_STATE');
```

**Key Features:**

- Structured logging with levels (debug, info, warn, error, critical)
- User/session context tracking
- Firebase error mapping to user-friendly messages
- Integration hooks for Sentry/monitoring
- Performance measurement utilities

### Environment Configuration

Type-safe environment configuration with validation (`src/lib/env-config.ts`):

```typescript
import { envConfig, isFeatureEnabled } from '@/lib/env-config';

// Access config
if (envConfig.isDevelopment) {
  /* dev code */
}

// Feature flags
if (isFeatureEnabled('estimates')) {
  /* show feature */
}
```

**Environment Variables** (see `.env.example`):

- Firebase configuration
- Feature flags (estimates, timeTracking, scheduling, analytics)
- Monitoring integration (Sentry)
- Debug settings

### CI/CD Pipeline

Automated workflows in `.github/workflows/`:

- **ci.yml**: PR validation (lint, test, build, security scan)
- **deploy-staging.yml**: Auto-deploy to staging on develop branch
- **deploy-production.yml**: Deploy to production with manual approval

**Quality Gates:**

- ESLint with 0 max warnings
- TypeScript strict mode checks
- Test coverage reporting
- Bundle size limits (5MB)
- Lighthouse performance checks

### Testing Infrastructure

Comprehensive test utilities in `src/test/`:

```typescript
import { renderWithProviders, screen } from '@/test/utils/test-utils';
import { testData, createMockUser } from '@/test/mocks/firebase';

describe('MyComponent', () => {
  it('should render', () => {
    const user = createMockUser({ role: 'admin' });
    renderWithProviders(<MyComponent />, { initialUser: user });
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

**Features:**

- Firebase mocking utilities
- React Query test helpers
- Custom render with all providers
- Test data factories
- See `src/hooks/__tests__/useInvoices.test.ts` for examples

## Testing Approach

**Unit & Integration Tests:**

```bash
npm test                 # Run all tests
npm run test:ui         # Interactive test UI
npm run test:coverage   # Generate coverage report
```

**Writing Tests:**

1. Use `renderWithProviders` from `@/test/utils/test-utils`
2. Use test data factories from `@/test/mocks/firebase`
3. Mock Firebase operations with provided utilities
4. Test error handling and edge cases

**Development Testing:**

1. Use Firebase Emulators for isolated testing
2. Browser console utilities for quick data setup
3. Check network tab for Firestore permission errors
4. Verify `companyId` is present on all operations
5. Use logger to track operations and debug issues

## Docker Support

Run entire dev environment with Docker:

```bash
docker-compose up
```

This starts:

- Firebase Emulators (ports 4000, 5001, 8080, 9099, 9199)
- Vite Dev Server (port 5173)
