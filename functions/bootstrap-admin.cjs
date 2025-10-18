#!/usr/bin/env node

/**
 * Bootstrap First Admin User
 *
 * Production-ready script to assign admin role to the first user
 * Uses Firebase Admin SDK with Application Default Credentials
 */

const admin = require('firebase-admin');
const serviceAccount = require('./lib/config/service-account.json');

// Initialize Admin SDK with service account credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sierra-painting-staging'
});

const TARGET_USER_ID = 'nwnGrtbIj8V5SGkcNn9QsSH6Ipc2';
const EMAIL = 'juan_vallejo@uri.edu';
const COMPANY_ID = 'sierra-painting-staging-001';
const COMPANY_NAME = 'Sierra Painting';
const ROLE = 'admin';

async function bootstrapAdmin() {
  try {
    console.log('🔧 Bootstrapping first admin user...');
    console.log('User ID:', TARGET_USER_ID);
    console.log('Email:', EMAIL);
    console.log('Company ID:', COMPANY_ID);
    console.log('Role:', ROLE);
    console.log('');

    // Step 1: Set custom claims
    console.log('Step 1/3: Setting custom claims...');
    await admin.auth().setCustomUserClaims(TARGET_USER_ID, {
      role: ROLE,
      companyId: COMPANY_ID,
      updatedAt: Date.now()
    });
    console.log('✅ Custom claims set successfully!');
    console.log('');

    // Step 2: Create company document
    console.log('Step 2/3: Creating company document...');
    const companyRef = admin.firestore().collection('companies').doc(COMPANY_ID);
    const companySnap = await companyRef.get();

    if (companySnap.exists) {
      console.log('⚠️  Company document already exists, skipping...');
    } else {
      await companyRef.set({
        id: COMPANY_ID,
        name: COMPANY_NAME,
        email: EMAIL,
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });
      console.log('✅ Company document created!');
    }
    console.log('');

    // Step 3: Create/update user document
    console.log('Step 3/3: Creating user document...');
    await admin.firestore().collection('users').doc(TARGET_USER_ID).set({
      uid: TARGET_USER_ID,
      email: EMAIL,
      displayName: 'Admin User',
      role: ROLE,
      companyId: COMPANY_ID,
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });
    console.log('✅ User document created!');
    console.log('');

    console.log('🎉 Admin user bootstrapped successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Refresh the staging app in your browser');
    console.log('2. Sign out and sign back in with:', EMAIL);
    console.log('3. You should be redirected to the admin dashboard');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('- Make sure you are logged in: npx firebase login');
    console.log('- Make sure you have admin access to the project');
    console.log('- Check if the user UID is correct in Firebase Console');
    process.exit(1);
  }
}

bootstrapAdmin();
