import { doc, setDoc, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

/**
 * Initialize Firebase with a test admin user and company
 * Only use this in development/testing environments
 */
export async function initializeFirebaseWithAdmin(
  email: string = 'admin@test.com',
  password: string = 'Admin123!',
  companyName: string = 'Test Company',
) {
  try {
    console.log('🚀 Initializing Firebase with admin user...');

    // Step 1: Create the admin user account
    console.log('Creating admin user account...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Step 2: Update the user's display name
    await updateProfile(user, {
      displayName: 'Admin User',
    });

    // Step 3: Create a company document
    const companyId = 'test-company-001';
    console.log(`Creating company: ${companyName} (${companyId})`);

    await setDoc(doc(db, 'companies', companyId), {
      id: companyId,
      name: companyName,
      email: email,
      phone: '555-0100',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Step 4: Create the user document in Firestore with explicit companyId
    console.log('Creating user document...');
    const userData = {
      uid: user.uid,
      email: user.email || email,
      displayName: 'Admin User',
      role: 'admin',
      companyId: companyId, // Explicitly set companyId for multi-tenancy
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log('User data to be written:', userData);
    await setDoc(doc(db, 'users', user.uid), userData);

    // Verify the document was created with companyId
    const verifyDoc = await getDoc(doc(db, 'users', user.uid));
    if (verifyDoc.exists()) {
      const verifyData = verifyDoc.data();
      console.log('✅ User document verified:', verifyData);
      if (!verifyData.companyId) {
        console.error('⚠️ WARNING: User document created but companyId is missing!');
      }
    } else {
      console.error('⚠️ WARNING: User document was not created!');
    }

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🏢 Company ID:', companyId);
    console.log('👤 User ID:', user.uid);

    return {
      user,
      companyId,
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Error initializing Firebase:', error);

    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ User already exists. You can sign in with the existing credentials.');
      return {
        user: null,
        companyId: null,
        success: false,
        error: 'User already exists',
      };
    }

    throw error;
  }
}

/**
 * Seed test data for development
 * Creates sample jobs, invoices, and employees
 */
export async function seedTestData(companyId: string = 'test-company-001') {
  try {
    console.log('🌱 Seeding test data...');

    const batch = writeBatch(db);
    const now = Timestamp.now();

    // Check if data already exists
    const jobsRef = doc(db, 'jobs', 'test-job-001');
    const jobDoc = await getDoc(jobsRef);

    if (jobDoc.exists()) {
      console.log('⚠️ Test data already exists. Skipping seed.');
      return { success: false, message: 'Data already exists' };
    }

    // Create sample jobs
    const jobs = [
      {
        id: 'test-job-001',
        name: 'Residential Paint - Smith House',
        address: '456 Oak Avenue, Test City, CA 90210',
        status: 'scheduled',
        startDate: Timestamp.fromDate(new Date('2025-10-20')),
        endDate: Timestamp.fromDate(new Date('2025-10-25')),
        workers: [],
        workerNames: [],
        description: 'Interior and exterior painting',
        notes: 'Client prefers neutral colors',
        companyId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'test-job-002',
        name: 'Commercial Building - Main Street',
        address: '789 Main Street, Test City, CA 90211',
        status: 'in_progress',
        startDate: Timestamp.fromDate(new Date('2025-10-15')),
        endDate: Timestamp.fromDate(new Date('2025-10-30')),
        workers: [],
        workerNames: [],
        description: 'Full exterior repaint',
        notes: 'Work must be done on weekends',
        companyId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'test-job-003',
        name: 'Office Complex - Tech Park',
        address: '321 Innovation Drive, Test City, CA 90212',
        status: 'completed',
        startDate: Timestamp.fromDate(new Date('2025-09-01')),
        endDate: Timestamp.fromDate(new Date('2025-09-15')),
        workers: [],
        workerNames: [],
        description: 'Interior office painting',
        notes: 'Client very satisfied',
        companyId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    jobs.forEach((job) => {
      batch.set(doc(db, 'jobs', job.id), job);
    });

    // Create sample invoices
    const invoices = [
      {
        id: 'test-invoice-001',
        invoiceNumber: 'INV-2025-001',
        client: 'John Smith',
        clientEmail: 'john.smith@example.com',
        amount: 5000,
        subtotal: 4545.45,
        tax: 454.55,
        taxRate: 0.1,
        status: 'paid',
        date: Timestamp.fromDate(new Date('2025-09-15')),
        dueDate: Timestamp.fromDate(new Date('2025-09-30')),
        sentDate: Timestamp.fromDate(new Date('2025-09-15')),
        paidDate: Timestamp.fromDate(new Date('2025-09-28')),
        amountPaid: 5000,
        remainingBalance: 0,
        payments: [
          {
            amount: 5000,
            date: Timestamp.fromDate(new Date('2025-09-28')),
            method: 'check',
            reference: 'CHK-12345',
          },
        ],
        jobId: 'test-job-003',
        notes: 'Thank you for your business!',
        companyId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'test-invoice-002',
        invoiceNumber: 'INV-2025-002',
        client: 'Tech Park Properties',
        clientEmail: 'billing@techpark.com',
        amount: 12000,
        subtotal: 10909.09,
        tax: 1090.91,
        taxRate: 0.1,
        status: 'sent',
        date: Timestamp.fromDate(new Date('2025-10-10')),
        dueDate: Timestamp.fromDate(new Date('2025-11-10')),
        sentDate: Timestamp.fromDate(new Date('2025-10-10')),
        amountPaid: 0,
        remainingBalance: 12000,
        payments: [],
        jobId: 'test-job-002',
        notes: 'Net 30 payment terms',
        companyId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    invoices.forEach((invoice) => {
      batch.set(doc(db, 'invoices', invoice.id), invoice);
    });

    // Create sample estimates
    const estimates = [
      {
        id: 'test-estimate-001',
        estimateNumber: 'EST-2025-001',
        client: 'Jane Doe',
        clientEmail: 'jane.doe@example.com',
        amount: 3500,
        status: 'sent',
        date: Timestamp.fromDate(new Date('2025-10-12')),
        expiryDate: Timestamp.fromDate(new Date('2025-11-12')),
        description: 'Residential painting project',
        lineItems: [
          { description: 'Interior painting (3 rooms)', quantity: 3, rate: 800, amount: 2400 },
          { description: 'Exterior trim painting', quantity: 1, rate: 1100, amount: 1100 },
        ],
        notes: 'Estimate valid for 30 days',
        companyId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    estimates.forEach((estimate) => {
      batch.set(doc(db, 'estimates', estimate.id), estimate);
    });

    // Commit the batch
    await batch.commit();

    console.log('✅ Test data seeded successfully!');
    console.log(
      `📊 Created ${jobs.length} jobs, ${invoices.length} invoices, ${estimates.length} estimates`,
    );

    return {
      success: true,
      counts: {
        jobs: jobs.length,
        invoices: invoices.length,
        estimates: estimates.length,
      },
    };
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

/**
 * Complete initialization: Create admin user, company, and seed data
 */
export async function completeInitialization() {
  try {
    console.log('🚀 Starting complete Firebase initialization...\n');

    // Step 1: Initialize with admin user
    const result = await initializeFirebaseWithAdmin();

    if (!result.success) {
      console.log('\n⚠️ Skipping data seeding due to initialization failure.');
      return result;
    }

    console.log('\n');

    // Step 2: Wait a moment for the user document to propagate
    console.log('⏳ Waiting for user document to propagate...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 3: Verify user is signed in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ User not signed in after creation!');
      return { success: false, error: 'User not signed in' };
    }

    console.log('✅ User verified:', currentUser.email);

    // Step 4: Seed test data
    const seedResult = await seedTestData(result.companyId!);

    console.log('\n✅ Complete initialization finished!');
    console.log('\n📝 Next steps:');
    console.log('1. Refresh the page');
    console.log('2. Sign in with: admin@test.com / Admin123!');
    console.log('3. Explore the Jobs, Invoices, and Estimates screens');

    return {
      ...result,
      seedResult,
    };
  } catch (error) {
    console.error('❌ Complete initialization failed:', error);
    throw error;
  }
}

/**
 * Fix existing user document by adding missing companyId
 */
export async function fixUserCompanyId() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No user is currently signed in');
      return { success: false, error: 'No user signed in' };
    }

    console.log('🔧 Fixing user document for:', currentUser.email);

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('❌ User document does not exist');
      return { success: false, error: 'User document not found' };
    }

    const userData = userDoc.data();
    console.log('Current user data:', userData);

    if (userData.companyId) {
      console.log('✅ User already has companyId:', userData.companyId);
      return { success: true, message: 'User already has companyId' };
    }

    // Add companyId to user
    const companyId = 'test-company-001';
    await setDoc(
      userRef,
      {
        ...userData,
        companyId: companyId,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

    console.log('✅ Added companyId to user:', companyId);
    console.log('🔄 Please reload the page for changes to take effect');

    return { success: true, companyId };
  } catch (error) {
    console.error('❌ Error fixing user companyId:', error);
    throw error;
  }
}

/**
 * Reset all test data and reinitialize
 */
export async function resetAndReinitialize() {
  try {
    console.log('🔄 Resetting and reinitializing Firebase data...\n');

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No user is currently signed in');
      console.log('Please sign in first, then run this function');
      return { success: false, error: 'No user signed in' };
    }

    // Fix user companyId
    console.log('Step 1: Fixing user companyId...');
    await fixUserCompanyId();

    console.log('\nStep 2: Seeding test data...');
    const seedResult = await seedTestData('test-company-001');

    console.log('\n✅ Reset and reinitialization complete!');
    console.log('🔄 Please reload the page');

    return { success: true, seedResult };
  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  }
}

/**
 * Check current user status and data integrity
 */
export async function checkUserStatus() {
  const currentUser = auth.currentUser;

  console.log('👤 Current User Status:');
  console.log('=====================================');

  if (!currentUser) {
    console.log('❌ Not signed in');
    return { signedIn: false };
  }

  console.log('✅ Signed in as:', currentUser.email);
  console.log('User ID:', currentUser.uid);

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('❌ User document does not exist in Firestore');
      return { signedIn: true, hasDocument: false };
    }

    const userData = userDoc.data();
    console.log('\n📄 User Document:');
    console.log('  - Role:', userData.role);
    console.log('  - Company ID:', userData.companyId || '❌ MISSING');
    console.log('  - Status:', userData.status);
    console.log('  - Display Name:', userData.displayName);

    if (!userData.companyId) {
      console.log('\n⚠️ WARNING: User is missing companyId!');
      console.log('Run: fixUserCompanyId() to fix this');
    }

    return {
      signedIn: true,
      hasDocument: true,
      hasCompanyId: !!userData.companyId,
      user: userData,
    };
  } catch (error) {
    console.error('❌ Error checking user status:', error);
    return { signedIn: true, error };
  }
}

// Make functions available in browser console for development
if (typeof window !== 'undefined') {
  (window as any).initFirebase = completeInitialization;
  (window as any).seedTestData = seedTestData;
  (window as any).initAdmin = initializeFirebaseWithAdmin;
  (window as any).fixUserCompanyId = fixUserCompanyId;
  (window as any).resetAndReinitialize = resetAndReinitialize;
  (window as any).checkUserStatus = checkUserStatus;

  console.log('\n🔧 Firebase initialization utilities loaded!');
  console.log('Run in console:');
  console.log('  checkUserStatus() - Check current user status');
  console.log('  initFirebase() - Complete setup with admin user and test data');
  console.log('  fixUserCompanyId() - Fix missing companyId on current user');
  console.log('  resetAndReinitialize() - Fix user and reseed data');
  console.log('  seedTestData() - Seed test data only\n');
}
