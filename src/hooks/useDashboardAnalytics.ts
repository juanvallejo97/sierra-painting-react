import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

/**
 * Dashboard KPI metrics
 */
export interface DashboardKPIs {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number; // Percentage change
  outstandingBalance: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  jobCompletionRate: number; // Percentage
  totalEstimates: number;
  approvedEstimates: number;
  estimateConversionRate: number; // Percentage
  overdueInvoices: number;
  overdueAmount: number;
}

/**
 * Revenue data by month for charts
 */
export interface MonthlyRevenue {
  month: string;
  revenue: number;
  invoiceCount: number;
}

/**
 * Job status distribution
 */
export interface JobStatusStats {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/**
 * Invoice aging buckets
 */
export interface InvoiceAging {
  current: number; // 0-30 days
  thirtyDays: number; // 31-60 days
  sixtyDays: number; // 61-90 days
  ninetyDaysPlus: number; // 90+ days
}

/**
 * Employee productivity metrics
 */
export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  jobsCompleted: number;
  averageHoursPerJob: number;
}

/**
 * Complete dashboard analytics
 */
export interface DashboardAnalytics {
  kpis: DashboardKPIs;
  monthlyRevenue: MonthlyRevenue[];
  jobStatusStats: JobStatusStats;
  invoiceAging: InvoiceAging;
  topEmployees: EmployeeStats[];
}

/**
 * Fetch comprehensive dashboard analytics
 */
export function useDashboardAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-analytics', user?.companyId],
    queryFn: async (): Promise<DashboardAnalytics> => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = endOfMonth(subMonths(now, 1));

      // Fetch all invoices
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('companyId', '==', user.companyId),
        orderBy('date', 'desc')
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);

      // Fetch all jobs
      const jobsRef = collection(db, 'jobs');
      const jobsQuery = query(
        jobsRef,
        where('companyId', '==', user.companyId)
      );
      const jobsSnapshot = await getDocs(jobsQuery);

      // Fetch all estimates
      const estimatesRef = collection(db, 'estimates');
      const estimatesQuery = query(
        estimatesRef,
        where('companyId', '==', user.companyId)
      );
      const estimatesSnapshot = await getDocs(estimatesQuery);

      // Process invoice data
      let totalRevenue = 0;
      let revenueThisMonth = 0;
      let revenueLastMonth = 0;
      let outstandingBalance = 0;
      let overdueInvoices = 0;
      let overdueAmount = 0;
      const monthlyRevenueMap = new Map<string, { revenue: number; count: number }>();
      const invoiceAging: InvoiceAging = {
        current: 0,
        thirtyDays: 0,
        sixtyDays: 0,
        ninetyDaysPlus: 0,
      };

      invoicesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const invoiceDate = new Date(data.date);
        const dueDate = new Date(data.dueDate);
        const amount = data.amount || 0;
        const amountPaid = data.amountPaid || 0;
        const remainingBalance = data.remainingBalance || 0;

        // Total revenue (all paid amounts)
        totalRevenue += amountPaid;

        // Revenue this month
        if (invoiceDate >= startOfThisMonth) {
          revenueThisMonth += amountPaid;
        }

        // Revenue last month
        if (invoiceDate >= startOfLastMonth && invoiceDate <= endOfLastMonth) {
          revenueLastMonth += amountPaid;
        }

        // Outstanding balance
        if (remainingBalance > 0) {
          outstandingBalance += remainingBalance;

          // Check if overdue
          if (dueDate < now && data.status !== 'paid') {
            overdueInvoices++;
            overdueAmount += remainingBalance;

            // Calculate aging
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 30) {
              invoiceAging.current += remainingBalance;
            } else if (daysOverdue <= 60) {
              invoiceAging.thirtyDays += remainingBalance;
            } else if (daysOverdue <= 90) {
              invoiceAging.sixtyDays += remainingBalance;
            } else {
              invoiceAging.ninetyDaysPlus += remainingBalance;
            }
          }
        }

        // Monthly revenue for charts (last 6 months)
        const monthKey = format(invoiceDate, 'MMM yyyy');
        const existing = monthlyRevenueMap.get(monthKey) || { revenue: 0, count: 0 };
        monthlyRevenueMap.set(monthKey, {
          revenue: existing.revenue + amountPaid,
          count: existing.count + 1,
        });
      });

      // Calculate revenue growth
      const revenueGrowth = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 0;

      // Process job data
      const jobStatusStats: JobStatusStats = {
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      };

      jobsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const status = data.status;
        if (status === 'scheduled') jobStatusStats.scheduled++;
        else if (status === 'in-progress') jobStatusStats.inProgress++;
        else if (status === 'completed') jobStatusStats.completed++;
        else if (status === 'cancelled') jobStatusStats.cancelled++;
      });

      const totalJobs = jobsSnapshot.docs.length;
      const activeJobs = jobStatusStats.scheduled + jobStatusStats.inProgress;
      const completedJobs = jobStatusStats.completed;
      const jobCompletionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

      // Process estimate data
      let approvedEstimates = 0;
      estimatesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'approved') {
          approvedEstimates++;
        }
      });

      const totalEstimates = estimatesSnapshot.docs.length;
      const estimateConversionRate = totalEstimates > 0
        ? (approvedEstimates / totalEstimates) * 100
        : 0;

      // Build monthly revenue array (last 6 months)
      const monthlyRevenue: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MMM yyyy');
        const data = monthlyRevenueMap.get(monthKey) || { revenue: 0, count: 0 };
        monthlyRevenue.push({
          month: monthKey,
          revenue: data.revenue,
          invoiceCount: data.count,
        });
      }

      // Calculate top employees (placeholder - would need time entry data)
      const topEmployees: EmployeeStats[] = [];

      return {
        kpis: {
          totalRevenue,
          revenueThisMonth,
          revenueLastMonth,
          revenueGrowth,
          outstandingBalance,
          totalJobs,
          activeJobs,
          completedJobs,
          jobCompletionRate,
          totalEstimates,
          approvedEstimates,
          estimateConversionRate,
          overdueInvoices,
          overdueAmount,
        },
        monthlyRevenue,
        jobStatusStats,
        invoiceAging,
        topEmployees,
      };
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes - balance between freshness and performance
  });
}
