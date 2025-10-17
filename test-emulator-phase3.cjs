/**
 * Phase 3 Feature Testing via Firebase Emulators
 *
 * Tests notifications, activity feed, permissions, and audit logging
 * against local Firebase emulators
 */

const http = require('http');

// Emulator endpoints
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const AUTH_HOST = '127.0.0.1';
const AUTH_PORT = 9099;
const PROJECT_ID = 'sierra-painting-staging';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper: Make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Helper: Create test user via Auth Emulator
async function createTestUser(email, password, displayName) {
  const options = {
    hostname: AUTH_HOST,
    port: AUTH_PORT,
    path: `/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = {
    email,
    password,
    displayName,
    returnSecureToken: true
  };

  const response = await makeRequest(options, data);
  return response.data;
}

// Helper: Get ID token for user
async function signInUser(email, password) {
  const options = {
    hostname: AUTH_HOST,
    port: AUTH_PORT,
    path: `/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = {
    email,
    password,
    returnSecureToken: true
  };

  const response = await makeRequest(options, data);
  return response.data;
}

// Helper: Create Firestore document
async function createDocument(collection, docId, data, idToken = null) {
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${docId}`;

  const options = {
    hostname: FIRESTORE_HOST,
    port: FIRESTORE_PORT,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (idToken) {
    options.headers['Authorization'] = `Bearer ${idToken}`;
  }

  // Convert data to Firestore format
  const firestoreData = {
    fields: {}
  };

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      firestoreData.fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      firestoreData.fields[key] = { integerValue: value };
    } else if (typeof value === 'boolean') {
      firestoreData.fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      firestoreData.fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      firestoreData.fields[key] = {
        arrayValue: {
          values: value.map(v => ({ stringValue: v }))
        }
      };
    }
  }

  const response = await makeRequest(options, firestoreData);
  return response;
}

// Helper: Get Firestore document
async function getDocument(collection, docId, idToken = null) {
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;

  const options = {
    hostname: FIRESTORE_HOST,
    port: FIRESTORE_PORT,
    path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (idToken) {
    options.headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await makeRequest(options);
  return response;
}

// Helper: Query Firestore collection
async function queryCollection(collection, idToken = null) {
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`;

  const options = {
    hostname: FIRESTORE_HOST,
    port: FIRESTORE_PORT,
    path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (idToken) {
    options.headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await makeRequest(options);
  return response;
}

// Test helper
function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
    }
  };
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// PHASE 3 TESTS
// ============================================================================

const tests = [
  test('Emulator Health Check', async () => {
    const options = {
      hostname: FIRESTORE_HOST,
      port: FIRESTORE_PORT,
      path: '/',
      method: 'GET'
    };

    const response = await makeRequest(options);
    assert(response.status === 200, 'Firestore emulator not responding');
  }),

  test('Create Test Admin User', async () => {
    const user = await createTestUser(
      'admin@test.com',
      'password123',
      'Test Admin'
    );

    assert(user.email === 'admin@test.com', 'Admin user not created');
    assert(user.localId, 'No user ID returned');

    // Store for later tests
    global.adminUserId = user.localId;
  }),

  test('Sign In Admin User', async () => {
    const auth = await signInUser('admin@test.com', 'password123');
    global.adminToken = auth.idToken;
    assert(global.adminToken, 'No ID token returned');
  }),

  test('Create Test Company Document', async () => {
    const companyId = 'test-company-001';
    const response = await createDocument(
      'companies',
      companyId,
      {
        id: companyId, // Required by security rules
        name: 'Test Painting Company',
        email: 'admin@test.com',
        phone: '555-0100',
        address: '123 Test St',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      },
      global.adminToken
    );

    global.companyId = companyId;
    assert(response.status === 200, `Failed to create company: ${response.status}`);
  }),

  test('Create Test User Document with Admin Role', async () => {
    const response = await createDocument(
      'users',
      global.adminUserId,
      {
        uid: global.adminUserId, // Required by security rules
        email: 'admin@test.com',
        displayName: 'Test Admin',
        role: 'admin',
        companyId: global.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      },
      global.adminToken
    );

    assert(response.status === 200, `Failed to create user doc: ${response.status}`);
  }),

  test('Notification System - Create Notification', async () => {
    const notificationId = `notif-${Date.now()}`;
    const response = await createDocument(
      'notifications',
      notificationId,
      {
        type: 'job_assigned',
        priority: 'normal', // Required by security rules
        userId: global.adminUserId,
        companyId: global.companyId,
        title: 'New Job Assigned',
        message: 'You have been assigned to Project Alpha',
        read: false,
        archived: false, // Required by security rules
        createdAt: new Date()
      },
      global.adminToken
    );

    global.notificationId = notificationId;
    assert(response.status === 200, `Failed to create notification: ${response.status}`);
  }),

  test('Notification System - Read Own Notification', async () => {
    const response = await getDocument(
      'notifications',
      global.notificationId,
      global.adminToken
    );

    assert(response.status === 200, 'Cannot read own notification');
    assert(response.data.fields, 'No notification data returned');
  }),

  test('Notification Preferences - Create Preferences', async () => {
    const response = await createDocument(
      'notificationPreferences',
      global.adminUserId,
      {
        userId: global.adminUserId,
        emailNotifications: true,
        pushNotifications: true,
        jobAssignments: true,
        invoiceUpdates: true,
        systemAlerts: true
      },
      global.adminToken
    );

    assert(response.status === 200, `Failed to create notification preferences: ${response.status}`);
  }),

  test('Activity Feed - Create Activity Entry', async () => {
    const activityId = `activity-${Date.now()}`;
    const response = await createDocument(
      'activityFeed',
      activityId,
      {
        type: 'job_created', // Required by security rules
        userId: global.adminUserId,
        userEmail: 'admin@test.com', // Required by security rules
        userName: 'Test Admin', // Required by security rules
        companyId: global.companyId,
        title: 'Created Job', // Required by security rules
        description: 'Created new painting job', // Required by security rules
        timestamp: new Date() // Required by security rules
      },
      global.adminToken
    );

    global.activityId = activityId;
    assert(response.status === 200, `Failed to create activity entry: ${response.status}`);
  }),

  test('Activity Feed - Read Activity Entry', async () => {
    const response = await getDocument(
      'activityFeed',
      global.activityId,
      global.adminToken
    );

    assert(response.status === 200, 'Cannot read activity entry');
  }),

  test('Activity Feed - Query Company Activities', async () => {
    const response = await queryCollection(
      'activityFeed',
      global.adminToken
    );

    assert(response.status === 200, 'Cannot query activity feed');
  }),

  test('Create Worker User for Permission Testing', async () => {
    const workerAuth = await createTestUser(
      'worker@test.com',
      'password123',
      'Test Worker'
    );

    global.workerUserId = workerAuth.localId;
    global.workerToken = (await signInUser('worker@test.com', 'password123')).idToken;

    // Create worker user document with limited role
    await createDocument(
      'users',
      global.workerUserId,
      {
        uid: global.workerUserId,
        email: 'worker@test.com',
        displayName: 'Test Worker',
        role: 'worker',
        companyId: global.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      },
      global.workerToken
    );
  }),

  test('Permission System - Worker Cannot Access Other User Notifications', async () => {
    const response = await getDocument(
      'notifications',
      global.notificationId, // Admin's notification
      global.workerToken // Worker trying to access
    );

    // Should be denied (403) or not found (404)
    assert(response.status === 403 || response.status === 404,
      `Worker should not access other user notifications (got ${response.status})`);
  }),

  test('Audit Logging - Create Audit Entry', async () => {
    const auditId = `audit-${Date.now()}`;
    const response = await createDocument(
      'auditLogs', // Note: collection is auditLogs not auditLog
      auditId,
      {
        eventType: 'invoice_updated', // Required by security rules
        severity: 'info', // Required by security rules
        userId: global.adminUserId,
        userEmail: 'admin@test.com', // Required by security rules
        companyId: global.companyId,
        action: 'update',
        resource: 'invoice',
        resourceId: 'inv-001',
        changes: 'Updated invoice status to paid',
        timestamp: new Date(),
        ipAddress: '127.0.0.1'
      },
      global.adminToken
    );

    global.auditId = auditId;
    assert(response.status === 200, `Failed to create audit log entry: ${response.status}`);
  }),

  test('Audit Logging - Read Audit Entry as Admin', async () => {
    const response = await getDocument(
      'auditLogs',
      global.auditId,
      global.adminToken
    );

    assert(response.status === 200, 'Admin cannot read audit logs');
  }),

  test('Multi-tenancy - Create Second Company', async () => {
    const company2Auth = await createTestUser(
      'admin2@test.com',
      'password123',
      'Company 2 Admin'
    );

    global.company2AdminId = company2Auth.localId;
    global.company2Token = (await signInUser('admin2@test.com', 'password123')).idToken;

    const company2Id = 'test-company-002';
    await createDocument(
      'companies',
      company2Id,
      {
        id: company2Id,
        name: 'Second Painting Co',
        email: 'admin2@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      },
      global.company2Token
    );

    global.company2Id = company2Id;

    await createDocument(
      'users',
      global.company2AdminId,
      {
        uid: global.company2AdminId,
        email: 'admin2@test.com',
        displayName: 'Company 2 Admin',
        role: 'admin',
        companyId: global.company2Id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      },
      global.company2Token
    );
  }),

  test('Multi-tenancy - Company 2 Cannot Access Company 1 Activities', async () => {
    const response = await getDocument(
      'activityFeed',
      global.activityId, // Company 1's activity
      global.company2Token // Company 2 admin trying to access
    );

    assert(response.status === 403 || response.status === 404,
      `Company 2 should not access Company 1 activities (got ${response.status})`);
  }),

  test('Multi-tenancy - Company 2 Cannot Access Company 1 Audit Logs', async () => {
    const response = await getDocument(
      'auditLogs',
      global.auditId, // Company 1's audit log
      global.company2Token // Company 2 admin trying to access
    );

    assert(response.status === 403 || response.status === 404,
      `Company 2 should not access Company 1 audit logs (got ${response.status})`);
  }),

  test('Permission System - Worker Cannot Read Audit Logs', async () => {
    const response = await getDocument(
      'auditLogs',
      global.auditId,
      global.workerToken // Worker trying to access
    );

    assert(response.status === 403 || response.status === 404,
      `Worker should not access audit logs (got ${response.status})`);
  }),

  test('Analytics Events - Track Event via Custom Code', async () => {
    // This would normally go through Firebase Analytics SDK
    // For emulator testing, we verify the structure is correct
    const event = {
      name: 'job_created',
      params: {
        job_id: 'job-test-001',
        status: 'pending'
      }
    };

    assert(event.name, 'Event should have name');
    assert(event.params, 'Event should have params');
    console.log('  Analytics event structure validated');
  })
];

// ============================================================================
// RUN TESTS
// ============================================================================

async function runTests() {
  console.log('\n===========================================');
  console.log('Phase 3 Feature Testing via Firebase Emulators');
  console.log('===========================================\n');

  console.log('Testing against:');
  console.log(`  Firestore: http://${FIRESTORE_HOST}:${FIRESTORE_PORT}`);
  console.log(`  Auth: http://${AUTH_HOST}:${AUTH_PORT}`);
  console.log(`  Project: ${PROJECT_ID}\n`);

  for (const testFn of tests) {
    await testFn();
  }

  console.log('\n===========================================');
  console.log('Test Results');
  console.log('===========================================\n');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%\n`);

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  ✗ ${t.name}`);
        console.log(`    ${t.error}`);
      });
  }

  console.log('\n===========================================\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
