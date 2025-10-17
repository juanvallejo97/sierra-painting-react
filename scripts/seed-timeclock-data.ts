/**
 * Seed Time Clock Data Script
 *
 * Creates test time clock entries for payroll testing
 * Run from browser console by copy/pasting this code
 */

import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

interface TimeClockEntry {
  employeeId: string;
  employeeName: string;
  jobId: string;
  jobTitle: string;
  action: 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  validated: boolean;
  companyId: string;
  syncStatus: 'synced';
}

async function seedTimeClockData(companyId: string) {
  console.log('🌱 Seeding time clock data...');

  // Fetch employees
  const employeesSnapshot = await getDocs(
    query(collection(db, 'employees'), where('companyId', '==', companyId))
  );
  const employees = employeesSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
  }));

  if (employees.length === 0) {
    console.error('❌ No employees found. Create employees first.');
    return;
  }

  // Fetch jobs
  const jobsSnapshot = await getDocs(
    query(collection(db, 'jobs'), where('companyId', '==', companyId))
  );
  const jobs = jobsSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
  }));

  if (jobs.length === 0) {
    console.error('❌ No jobs found. Create jobs first.');
    return;
  }

  console.log(`📊 Found ${employees.length} employees and ${jobs.length} jobs`);

  // Sample location (adjust to your area)
  const sampleLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  };

  // Create entries for the last 7 days
  const entries: TimeClockEntry[] = [];
  const today = new Date();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // For each employee
    for (const employee of employees) {
      const job = jobs[Math.floor(Math.random() * jobs.length)];

      // Clock in at 7:00 AM
      const clockIn = new Date(date);
      clockIn.setHours(7, Math.floor(Math.random() * 30), 0, 0); // 7:00-7:30 AM

      // Lunch break at 12:00 PM
      const breakStart = new Date(date);
      breakStart.setHours(12, 0, 0, 0);

      const breakEnd = new Date(date);
      breakEnd.setHours(12, 30, 0, 0);

      // Clock out at 3:00 PM
      const clockOut = new Date(date);
      clockOut.setHours(15, Math.floor(Math.random() * 30), 0, 0); // 3:00-3:30 PM

      // Add entries
      entries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'clock-in',
        timestamp: clockIn,
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      entries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'break-start',
        timestamp: breakStart,
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      entries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'break-end',
        timestamp: breakEnd,
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      entries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'clock-out',
        timestamp: clockOut,
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });
    }
  }

  // Add all entries to Firestore
  console.log(`📝 Creating ${entries.length} time clock entries...`);

  for (const entry of entries) {
    await addDoc(collection(db, 'timeClockEntries'), {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp),
    });
  }

  console.log('✅ Time clock data seeded successfully!');
  console.log(`📊 Created ${entries.length} entries for ${employees.length} employees over 7 days`);
}

// Export for use in console
(window as any).seedTimeClockData = seedTimeClockData;

console.log('💡 To seed data, run: seedTimeClockData("YOUR_COMPANY_ID")');
console.log('💡 Get your company ID from: user.companyId in console');
