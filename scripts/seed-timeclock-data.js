/**
 * Seed Time Clock Data Script
 *
 * Copy and paste this entire script into your browser console while logged in as admin.
 * Then run: seedTimeClockData()
 */

async function seedTimeClockData() {
  console.log('🌱 Starting to seed time clock data...');

  // Get Firebase instances from window
  const { db, auth } = window;
  const { collection, addDoc, getDocs, query, where, Timestamp } = window.firestoreImports;

  if (!db || !auth || !collection) {
    console.error('❌ Firebase not initialized. Make sure you are logged in.');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No user logged in.');
    return;
  }

  // Get companyId from user's data
  const usersRef = collection(db, 'users');
  const userQuery = query(usersRef, where('uid', '==', user.uid));
  const userSnapshot = await getDocs(userQuery);

  if (userSnapshot.empty) {
    console.error('❌ User document not found.');
    return;
  }

  const companyId = userSnapshot.docs[0].data().companyId;
  console.log(`📊 Using companyId: ${companyId}`);

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

  // Sample location
  const sampleLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  };

  // Create entries for the last 7 days
  const today = new Date();
  let totalEntries = 0;

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    // For each employee
    for (const employee of employees) {
      const job = jobs[Math.floor(Math.random() * jobs.length)];

      // Clock in at 7:00-7:30 AM
      const clockIn = new Date(date);
      clockIn.setHours(7, Math.floor(Math.random() * 30), 0, 0);

      // Lunch break at 12:00 PM
      const breakStart = new Date(date);
      breakStart.setHours(12, 0, 0, 0);

      const breakEnd = new Date(date);
      breakEnd.setHours(12, 30, 0, 0);

      // Clock out at 3:00-3:30 PM
      const clockOut = new Date(date);
      clockOut.setHours(15, Math.floor(Math.random() * 30), 0, 0);

      // Add clock-in
      await addDoc(collection(db, 'timeClockEntries'), {
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'clock-in',
        timestamp: Timestamp.fromDate(clockIn),
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      // Add break-start
      await addDoc(collection(db, 'timeClockEntries'), {
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'break-start',
        timestamp: Timestamp.fromDate(breakStart),
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      // Add break-end
      await addDoc(collection(db, 'timeClockEntries'), {
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'break-end',
        timestamp: Timestamp.fromDate(breakEnd),
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      // Add clock-out
      await addDoc(collection(db, 'timeClockEntries'), {
        employeeId: employee.id,
        employeeName: employee.name,
        jobId: job.id,
        jobTitle: job.name,
        action: 'clock-out',
        timestamp: Timestamp.fromDate(clockOut),
        location: sampleLocation,
        validated: true,
        companyId,
        syncStatus: 'synced',
      });

      totalEntries += 4;
    }
  }

  console.log('✅ Time clock data seeded successfully!');
  console.log(`📊 Created ${totalEntries} entries for ${employees.length} employees over ${Math.floor(totalEntries / (employees.length * 4))} days`);
}

// Export to window
window.seedTimeClockData = seedTimeClockData;
console.log('💡 Script loaded! Run: seedTimeClockData()');
