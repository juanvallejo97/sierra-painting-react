#!/usr/bin/env node

/**
 * Verify Bootstrap Status
 *
 * Checks if admin user was properly bootstrapped with:
 * - Custom claims (role, companyId)
 * - Firestore user document
 * - Company document
 */

const admin = require('firebase-admin');
const serviceAccount = require('./lib/config/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sierra-painting-staging'
});

const TARGET_USER_ID = 'nwnGrtbIj8V5SGkcNn9QsSH6Ipc2';
const COMPANY_ID = 'sierra-painting-staging-001';

async function verifyBootstrap() {
  try {
    console.log('🔍 Verifying bootstrap status...\n');

    // Check 1: Custom Claims
    console.log('1️⃣ Checking custom claims...');
    const user = await admin.auth().getUser(TARGET_USER_ID);
    console.log('   Email:', user.email);
    console.log('   Custom Claims:', JSON.stringify(user.customClaims, null, 2));

    if (!user.customClaims?.role || !user.customClaims?.companyId) {
      console.log('   ❌ Missing custom claims!');
    } else {
      console.log('   ✅ Custom claims set correctly');
    }
    console.log('');

    // Check 2: User Document
    console.log('2️⃣ Checking user document...');
    const userDoc = await admin.firestore().collection('users').doc(TARGET_USER_ID).get();

    if (!userDoc.exists) {
      console.log('   ❌ User document does not exist!');
    } else {
      const userData = userDoc.data();
      console.log('   Email:', userData.email);
      console.log('   Role:', userData.role);
      console.log('   CompanyId:', userData.companyId);
      console.log('   Status:', userData.status);
      console.log('   ✅ User document exists');
    }
    console.log('');

    // Check 3: Company Document
    console.log('3️⃣ Checking company document...');
    const companyDoc = await admin.firestore().collection('companies').doc(COMPANY_ID).get();

    if (!companyDoc.exists) {
      console.log('   ❌ Company document does not exist!');
    } else {
      const companyData = companyDoc.data();
      console.log('   Name:', companyData.name);
      console.log('   Email:', companyData.email);
      console.log('   ✅ Company document exists');
    }
    console.log('');

    console.log('✅ Bootstrap verification complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  }
}

verifyBootstrap();
