# Firebase Emulator Testing Guide

This guide explains how to write and run tests against Firebase Emulators for the Sierra Painting React application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Firebase Emulators provide a local testing environment for Firebase services:

- **Firestore Emulator**: Test database operations and security rules
- **Auth Emulator**: Test authentication flows
- **Storage Emulator**: Test file uploads and downloads
- **Functions Emulator**: Test Cloud Functions locally

### Benefits

- ✅ **Fast**: No network latency to Firebase servers
- ✅ **Isolated**: Each test suite gets its own project
- ✅ **Free**: No quota limits or costs
- ✅ **Reproducible**: Consistent test data and state
- ✅ **Safe**: No risk of corrupting production data

## Prerequisites

### Required

- Node.js 18+ (you have 22.20.0 ✓)
- Firebase CLI installed globally: `npm install -g firebase-tools`
- Emulators initialized in project (already done ✓)

### Verify Installation

```bash
# Check Firebase CLI
firebase --version

# Check emulator status
npm run emulators:status
```

## Quick Start

### 1. Start the Emulators

```bash
# Option A: Using npm script (recommended)
npm run emulators:start

# Option B: Using Firebase CLI directly
firebase emulators:start --only auth,firestore,storage,functions

# Option C: Interactive mode (see logs)
npm run emulators
```

The emulator UI will be available at: http://localhost:4000

### 2. Run Emulator Tests

```bash
# Run all emulator tests
npm run test:emulator

# Watch mode (re-run on changes)
npm run test:emulator:watch

# With coverage
npm run test:emulator:coverage

# Run specific test file
npx vitest src/__tests__/emulator-integration.test.ts
```

### 3. Stop the Emulators

```bash
npm run emulators:stop

# Or press Ctrl+C if running in interactive mode
```

## Test Structure

### File Organization

```
src/
├── __tests__/                      # Emulator integration tests
│   ├── emulator-integration.test.ts
│   └── firestore-rules.test.ts    # Security rules tests
├── test/
│   ├── emulator-utils.ts          # Test utilities and factories
│   └── emulator-setup.ts          # Global test setup
├── hooks/__tests__/                # Unit tests (mock Firebase)
└── components/__tests__/           # Component tests (mock Firebase)
```

### Test Types

1. **Unit Tests** (`*.test.ts` in hooks/components)
   - Use mocked Firebase
   - Fast, isolated
   - Run with: `npm test`

2. **Emulator Tests** (`*.emulator.test.ts` or in `__tests__/`)
   - Use real Firebase Emulators
   - Test integration and security rules
   - Run with: `npm run test:emulator`

## Writing Tests

### Basic Example

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  getAuthContext,
  seedTestData,
  testDataFactory,
  assertSucceeds,
  assertFails,
} from '../test/emulator-utils';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';

describe('My Feature', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  beforeEach(async () => {
    // Clear data between tests
    await testEnv.clearFirestore();
  });

  it('should allow user to read their own data', async () => {
    // Arrange: Seed test data
    const testUser = testDataFactory.user({ uid: 'user-001' });
    const testJob = testDataFactory.job();
    await seedTestData(testEnv, {
      users: [testUser],
      jobs: [testJob],
    });

    // Act: Try to read as authenticated user
    const userContext = getAuthContext(testEnv, testUser.uid);
    const db = userContext.firestore();
    const jobDoc = db.collection('jobs').doc(testJob.id);

    // Assert: Should succeed
    await assertSucceeds(jobDoc.get());
  });
});
```

### Using Test Data Factories

```typescript
import { testDataFactory, TEST_COMPANY_ID } from '../test/emulator-utils';

// Create with defaults
const user = testDataFactory.user();

// Override specific fields
const adminUser = testDataFactory.user({
  uid: 'admin-001',
  email: 'admin@company.com',
  role: 'admin',
});

// Create multiple documents
const jobs = [
  testDataFactory.job({ id: 'job-1', name: 'Paint House' }),
  testDataFactory.job({ id: 'job-2', name: 'Deck Stain' }),
];

// Available factories
const company = testDataFactory.company();
const job = testDataFactory.job();
const invoice = testDataFactory.invoice();
const employee = testDataFactory.employee();
const estimate = testDataFactory.estimate();
```

### Testing Security Rules

```typescript
import { assertFails, assertSucceeds } from '../test/emulator-utils';

it('should deny cross-company access', async () => {
  // User from Company A
  const userA = testDataFactory.user({
    uid: 'user-a',
    companyId: 'company-a',
  });

  // Job from Company B
  const jobB = testDataFactory.job({
    companyId: 'company-b',
  });

  await seedTestData(testEnv, {
    users: [userA],
    jobs: [jobB],
  });

  // User A should NOT be able to read Job B
  const contextA = getAuthContext(testEnv, userA.uid);
  const db = contextA.firestore();
  await assertFails(db.collection('jobs').doc(jobB.id).get());
});
```

### Testing Authentication States

```typescript
import { getAuthContext, getUnauthContext } from '../test/emulator-utils';

it('should require authentication', async () => {
  const testJob = testDataFactory.job();
  await seedTestData(testEnv, { jobs: [testJob] });

  // Try to read as unauthenticated user
  const unauthContext = getUnauthContext(testEnv);
  const db = unauthContext.firestore();

  await assertFails(db.collection('jobs').doc(testJob.id).get());
});

it('should allow authenticated user with correct role', async () => {
  const adminUser = testDataFactory.user({
    uid: 'admin-001',
    role: 'admin',
  });

  await seedTestData(testEnv, { users: [adminUser] });

  // Admin should be able to perform operation
  const adminContext = getAuthContext(testEnv, adminUser.uid);
  const db = adminContext.firestore();

  await assertSucceeds(
    db.collection('jobs').add(testDataFactory.job())
  );
});
```

### Performance Testing

```typescript
import { measurePerformance, batchOperation } from '../test/emulator-setup';

it('should handle large dataset efficiently', async () => {
  const jobs = Array.from({ length: 1000 }, (_, i) =>
    testDataFactory.job({ id: `job-${i}` })
  );

  const { duration } = await measurePerformance('Seed 1000 jobs', async () => {
    await seedTestData(testEnv, { jobs });
  });

  expect(duration).toBeLessThan(10000); // < 10 seconds
});

it('should batch operations', async () => {
  const jobs = Array.from({ length: 100 }, (_, i) =>
    testDataFactory.job({ id: `job-${i}` })
  );

  await batchOperation(jobs, async (job) => {
    // Process each job
    const db = getAuthContext(testEnv, 'admin').firestore();
    await db.collection('jobs').doc(job.id).set(job);
  }, 10); // Batch size of 10
});
```

## Best Practices

### ✅ DO

1. **Clear data between tests**
   ```typescript
   beforeEach(async () => {
     await testEnv.clearFirestore();
   });
   ```

2. **Use factories for test data**
   ```typescript
   const job = testDataFactory.job({ status: 'completed' });
   ```

3. **Test both success and failure cases**
   ```typescript
   await assertSucceeds(validOperation);
   await assertFails(invalidOperation);
   ```

4. **Use descriptive test names**
   ```typescript
   it('should allow admin to delete any job in their company', async () => {
     // ...
   });
   ```

5. **Test role-based access control**
   ```typescript
   const admin = testDataFactory.user({ role: 'admin' });
   const viewer = testDataFactory.user({ role: 'viewer' });
   ```

### ❌ DON'T

1. **Don't share state between tests**
   - Always clear Firestore in `beforeEach`

2. **Don't hardcode timestamps**
   - Use `Timestamp.now()` or factory defaults

3. **Don't skip cleanup**
   - Always include `afterAll(cleanupTestEnvironment)`

4. **Don't test production data**
   - Emulators are isolated from production

5. **Don't run parallel emulator tests**
   - Config uses `singleFork: true` for stability

## Troubleshooting

### Emulators Won't Start

```bash
# Check if port is already in use
lsof -i :8080
lsof -i :9099

# Kill existing processes
npm run emulators:stop

# Or manually
pkill -f "firebase.*emulators"
```

### Tests Timeout

```bash
# Increase timeout in test file
it('slow operation', async () => {
  // ...
}, 60000); // 60 second timeout
```

Or update `vitest.emulator.config.ts`:
```typescript
testTimeout: 60000, // 60 seconds
```

### Emulator Connection Refused

1. Verify emulators are running:
   ```bash
   npm run emulators:status
   ```

2. Check emulator logs:
   ```bash
   tail -f /tmp/firebase-emulator.log
   ```

3. Restart emulators:
   ```bash
   npm run emulators:restart
   ```

### Tests Fail Intermittently

- **Cause**: Race conditions or timing issues
- **Solution**: Use `waitFor` helper
  ```typescript
  import { waitFor } from '../test/emulator-setup';

  await waitFor(() => someCondition, 5000);
  ```

### Coverage Not Accurate

- Emulator tests run in separate config
- View coverage: `npm run test:emulator:coverage`
- Report location: `coverage/emulator/index.html`

## Emulator Manager CLI

The emulator manager script provides convenient commands:

```bash
# Start emulators in background
npm run emulators:start

# Stop emulators
npm run emulators:stop

# Restart emulators
npm run emulators:restart

# Check status
npm run emulators:status

# Clear all data
npm run emulators:clear

# Export data (for seeding)
npm run emulators:export ./my-data

# Import data
npm run emulators:import
```

## Integration with CI/CD

In GitHub Actions:

```yaml
- name: Start Firebase Emulators
  run: npm run emulators:start

- name: Wait for Emulators
  run: sleep 10

- name: Run Emulator Tests
  run: npm run test:emulator

- name: Stop Emulators
  run: npm run emulators:stop
```

## Additional Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [@firebase/rules-unit-testing](https://firebase.google.com/docs/rules/unit-tests)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Vitest Documentation](https://vitest.dev/)

## Support

If you encounter issues:

1. Check the emulator logs: `/tmp/firebase-emulator.log`
2. Verify ports are available: 8080, 9099, 9199, 5001
3. Ensure emulators are running: `npm run emulators:status`
4. Review test output for specific error messages
5. Restart emulators: `npm run emulators:restart`
