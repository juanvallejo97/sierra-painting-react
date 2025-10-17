/**
 * Utility script to seed test data for local development
 * Run this in the browser console when logged in as admin@test.com
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export async function seedTestCompany() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('No user logged in. Please log in first.');
    return;
  }

  console.log('Seeding test company for user:', currentUser.email);

  try {
    // Create a default company
    const companyId = 'test-company-001';
    const companyRef = doc(db, 'companies', companyId);

    await setDoc(
      companyRef,
      {
        name: "D'Sierra Painting Test Company",
        email: 'contact@dsierrapainting.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Test City, CA 90210',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    console.log('✓ Company created:', companyId);

    // Update the current user's document with companyId
    const userRef = doc(db, 'users', currentUser.uid);

    await setDoc(
      userRef,
      {
        email: currentUser.email,
        displayName: currentUser.displayName || 'Admin User',
        role: 'admin',
        companyId: companyId,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    console.log('✓ User updated with companyId');

    console.log('✓ Seed complete! Please refresh the page.');
    console.log('You may need to sign out and sign back in for changes to take effect.');

    return {
      companyId,
      userId: currentUser.uid,
    };
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
}

// Make it globally available in console
(window as any).seedTestCompany = seedTestCompany;

console.log('Seed utility loaded. Run seedTestCompany() in the console to set up test data.');
