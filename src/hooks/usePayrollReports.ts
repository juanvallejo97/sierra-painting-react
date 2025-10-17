import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Employee payroll summary
 */
export interface EmployeePayrollSummary {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  hourlyRate: number;
  totalPay: number;
  entriesCount: number;
  jobsWorked: string[]; // Job IDs
  entries: TimeEntryDetail[];
}

/**
 * Time entry detail for payroll
 */
export interface TimeEntryDetail {
  id: string;
  date: string;
  jobId: string;
  jobTitle: string;
  hoursWorked: number;
  hourlyRate: number;
  totalPay: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

/**
 * Job cost breakdown
 */
export interface JobCostBreakdown {
  jobId: string;
  jobTitle: string;
  totalHours: number;
  totalLaborCost: number;
  employeeCount: number;
  employees: {
    employeeId: string;
    employeeName: string;
    hours: number;
    cost: number;
  }[];
}

/**
 * Complete payroll report data
 */
export interface PayrollReport {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalHours: number;
    totalPay: number;
    employeeCount: number;
    entriesCount: number;
    approvedEntries: number;
    pendingEntries: number;
  };
  employees: EmployeePayrollSummary[];
  jobCosts: JobCostBreakdown[];
}

/**
 * Date range preset options
 */
export type DateRangePreset = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';

/**
 * Get date range based on preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();

  switch (preset) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case 'this-week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'last-week': {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    }
    case 'this-month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'last-month': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    }
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires start and end dates');
      }
      return {
        startDate: startOfDay(customStart),
        endDate: endOfDay(customEnd),
      };
    default:
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
  }
}

/**
 * Fetch payroll report for a given date range
 */
export function usePayrollReport(preset: DateRangePreset = 'this-month', customStart?: Date, customEnd?: Date) {
  const { user } = useAuth();
  const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

  return useQuery({
    queryKey: ['payroll-report', user?.companyId, preset, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<PayrollReport> => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      // Fetch time clock entries in date range
      const timeClockRef = collection(db, 'timeClockEntries');
      const timeClockQuery = query(
        timeClockRef,
        where('companyId', '==', user.companyId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate))
      );
      const timeClockSnapshot = await getDocs(timeClockQuery);

      // Fetch all employees for this company
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(
        employeesRef,
        where('companyId', '==', user.companyId)
      );
      const employeesSnapshot = await getDocs(employeesQuery);

      // Fetch all jobs for this company
      const jobsRef = collection(db, 'jobs');
      const jobsQuery = query(
        jobsRef,
        where('companyId', '==', user.companyId)
      );
      const jobsSnapshot = await getDocs(jobsQuery);

      // Create lookup maps
      const employeeMap = new Map();
      employeesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        employeeMap.set(doc.id, {
          id: doc.id,
          name: data.name,
          hourlyRate: data.hourlyRate || 0,
        });
      });

      const jobMap = new Map();
      jobsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        jobMap.set(doc.id, {
          id: doc.id,
          title: data.name, // Fixed: jobs use 'name' not 'title'
        });
      });

      // Process time clock entries - calculate hours from clock-in/out pairs
      const employeeDataMap = new Map<string, EmployeePayrollSummary>();
      const jobCostMap = new Map<string, JobCostBreakdown>();
      let totalHours = 0;
      let totalPay = 0;
      let approvedEntries = 0;
      let pendingEntries = 0;

      // Group entries by employee and date
      interface DaySession {
        employeeId: string;
        date: string;
        jobId?: string;
        clockIn?: { timestamp: Date; id: string };
        clockOut?: { timestamp: Date; id: string };
        breaks: Array<{ start: Date; end?: Date }>;
        status: 'pending' | 'approved';
      }

      const sessions = new Map<string, DaySession>();

      // Sort entries by timestamp
      const sortedEntries = timeClockSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Build sessions from clock entries
      sortedEntries.forEach((entry: any) => {
        const employeeId = entry.employeeId;
        const dateKey = entry.timestamp.toISOString().split('T')[0];
        const sessionKey = `${employeeId}-${dateKey}`;

        if (!sessions.has(sessionKey)) {
          sessions.set(sessionKey, {
            employeeId,
            date: dateKey,
            jobId: entry.jobId,
            breaks: [],
            status: 'approved', // Default to approved for now
          });
        }

        const session = sessions.get(sessionKey)!;

        if (entry.action === 'clock-in') {
          session.clockIn = { timestamp: entry.timestamp, id: entry.id };
          session.jobId = entry.jobId;
        } else if (entry.action === 'clock-out') {
          session.clockOut = { timestamp: entry.timestamp, id: entry.id };
        } else if (entry.action === 'break-start') {
          session.breaks.push({ start: entry.timestamp });
        } else if (entry.action === 'break-end' && session.breaks.length > 0) {
          const lastBreak = session.breaks[session.breaks.length - 1];
          if (!lastBreak.end) {
            lastBreak.end = entry.timestamp;
          }
        }
      });

      // Calculate hours for each complete session
      sessions.forEach((session, sessionKey) => {
        if (!session.clockIn || !session.clockOut) {
          // Incomplete session - skip or mark as pending
          return;
        }

        const employee = employeeMap.get(session.employeeId);
        if (!employee) return;

        // Calculate total time worked in milliseconds (clock-out - clock-in)
        // NOTE: Break time is PAID - not deducted from payroll
        const totalMs = session.clockOut.timestamp.getTime() - session.clockIn.timestamp.getTime();

        // Convert to precise time components
        const totalSeconds = Math.floor(totalMs / 1000);
        const days = Math.floor(totalSeconds / 86400); // 86400 seconds in a day
        const hours = Math.floor((totalSeconds % 86400) / 3600); // 3600 seconds in an hour
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        // Convert to decimal hours for payroll calculation
        // Formula: days * 24 + hours + (minutes / 60) + (seconds / 3600)
        const hoursWorked = days * 24 + hours + (minutes / 60) + (seconds / 3600);

        const hourlyRate = employee.hourlyRate;
        const entryPay = hoursWorked * hourlyRate;

        const jobId = session.jobId || 'no-job';
        const job = jobMap.get(jobId);
        const jobTitle = job?.title || 'No Job Assigned';
        const status = session.status;

        // Track status counts
        if (status === 'approved') approvedEntries++;
        if (status === 'pending') pendingEntries++;

        // Update totals
        totalHours += hoursWorked;
        if (status === 'approved') {
          totalPay += entryPay;
        }

        // Create time entry detail
        const entryDetail: TimeEntryDetail = {
          id: session.clockIn.id,
          date: session.date,
          jobId,
          jobTitle,
          hoursWorked,
          hourlyRate,
          totalPay: entryPay,
          status,
          notes: `${session.clockIn.timestamp.toLocaleTimeString()} - ${session.clockOut.timestamp.toLocaleTimeString()}`,
        };

        // Aggregate by employee
        if (!employeeDataMap.has(session.employeeId)) {
          employeeDataMap.set(session.employeeId, {
            employeeId: session.employeeId,
            employeeName: employee.name,
            totalHours: 0,
            hourlyRate,
            totalPay: 0,
            entriesCount: 0,
            jobsWorked: [],
            entries: [],
          });
        }

        const employeeData = employeeDataMap.get(session.employeeId)!;
        employeeData.totalHours += hoursWorked;
        if (status === 'approved') {
          employeeData.totalPay += entryPay;
        }
        employeeData.entriesCount++;
        if (jobId !== 'no-job' && !employeeData.jobsWorked.includes(jobId)) {
          employeeData.jobsWorked.push(jobId);
        }
        employeeData.entries.push(entryDetail);

        // Aggregate by job
        if (jobId !== 'no-job') {
          if (!jobCostMap.has(jobId)) {
            jobCostMap.set(jobId, {
              jobId,
              jobTitle,
              totalHours: 0,
              totalLaborCost: 0,
              employeeCount: 0,
              employees: [],
            });
          }

          const jobCost = jobCostMap.get(jobId)!;
          jobCost.totalHours += hoursWorked;
          if (status === 'approved') {
            jobCost.totalLaborCost += entryPay;
          }

          // Find or create employee entry in job cost
          let employeeInJob = jobCost.employees.find(e => e.employeeId === session.employeeId);
          if (!employeeInJob) {
            employeeInJob = {
              employeeId: session.employeeId,
              employeeName: employee.name,
              hours: 0,
              cost: 0,
            };
            jobCost.employees.push(employeeInJob);
            jobCost.employeeCount++;
          }
          employeeInJob.hours += hoursWorked;
          if (status === 'approved') {
            employeeInJob.cost += entryPay;
          }
        }
      });

      // Convert maps to arrays and sort
      const employees = Array.from(employeeDataMap.values())
        .sort((a, b) => b.totalPay - a.totalPay); // Sort by total pay descending

      const jobCosts = Array.from(jobCostMap.values())
        .sort((a, b) => b.totalLaborCost - a.totalLaborCost); // Sort by cost descending

      return {
        dateRange: {
          startDate,
          endDate,
        },
        summary: {
          totalHours,
          totalPay,
          employeeCount: employeeDataMap.size,
          entriesCount: sessions.size, // Number of complete work sessions
          approvedEntries,
          pendingEntries,
        },
        employees,
        jobCosts,
      };
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Export payroll data to CSV format
 */
export function exportPayrollToCSV(report: PayrollReport): string {
  const lines: string[] = [];

  // Header
  lines.push('Sierra Painting - Payroll Report');
  lines.push(`Period: ${report.dateRange.startDate.toLocaleDateString()} - ${report.dateRange.endDate.toLocaleDateString()}`);
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push(`Total Hours,${report.summary.totalHours.toFixed(2)}`);
  lines.push(`Total Pay,$${report.summary.totalPay.toFixed(2)}`);
  lines.push(`Employees,${report.summary.employeeCount}`);
  lines.push(`Time Entries,${report.summary.entriesCount}`);
  lines.push(`Approved,${report.summary.approvedEntries}`);
  lines.push(`Pending,${report.summary.pendingEntries}`);
  lines.push('');

  // Employee breakdown
  lines.push('EMPLOYEE BREAKDOWN');
  lines.push('Employee,Total Hours,Hourly Rate,Total Pay,Entries,Jobs Worked');
  report.employees.forEach(emp => {
    lines.push(
      `"${emp.employeeName}",${emp.totalHours.toFixed(2)},${emp.hourlyRate.toFixed(2)},${emp.totalPay.toFixed(2)},${emp.entriesCount},${emp.jobsWorked.length}`
    );
  });
  lines.push('');

  // Detailed time entries
  lines.push('DETAILED TIME ENTRIES');
  lines.push('Employee,Date,Job,Hours,Rate,Pay,Status,Notes');
  report.employees.forEach(emp => {
    emp.entries.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString();
      const notes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '';
      lines.push(
        `"${emp.employeeName}",${date},"${entry.jobTitle}",${entry.hoursWorked.toFixed(2)},${entry.hourlyRate.toFixed(2)},${entry.totalPay.toFixed(2)},${entry.status},${notes}`
      );
    });
  });
  lines.push('');

  // Job cost breakdown
  lines.push('JOB COST BREAKDOWN');
  lines.push('Job,Total Hours,Total Labor Cost,Employees');
  report.jobCosts.forEach(job => {
    lines.push(
      `"${job.jobTitle}",${job.totalHours.toFixed(2)},${job.totalLaborCost.toFixed(2)},${job.employeeCount}`
    );
  });

  return lines.join('\n');
}

/**
 * Download CSV file
 */
export function downloadPayrollCSV(report: PayrollReport) {
  const csv = exportPayrollToCSV(report);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const startDate = report.dateRange.startDate.toISOString().split('T')[0];
  const endDate = report.dateRange.endDate.toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `payroll-report-${startDate}-to-${endDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
