import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  DollarSign,
  Briefcase,
  FileText,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function AdminHomeScreen() {
  const { data: analytics, isLoading, error } = useDashboardAnalytics();

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load dashboard analytics. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const kpis = analytics?.kpis;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Job status chart data
  const jobStatusData = analytics?.jobStatusStats
    ? [
        { name: 'Scheduled', value: analytics.jobStatusStats.scheduled, color: '#3b82f6' },
        { name: 'In Progress', value: analytics.jobStatusStats.inProgress, color: '#10b981' },
        { name: 'Completed', value: analytics.jobStatusStats.completed, color: '#6b7280' },
        { name: 'Cancelled', value: analytics.jobStatusStats.cancelled, color: '#ef4444' },
      ]
    : [];

  // Invoice aging chart data
  const invoiceAgingData = analytics?.invoiceAging
    ? [
        { name: '0-30 days', amount: analytics.invoiceAging.current },
        { name: '31-60 days', amount: analytics.invoiceAging.thirtyDays },
        { name: '61-90 days', amount: analytics.invoiceAging.sixtyDays },
        { name: '90+ days', amount: analytics.invoiceAging.ninetyDaysPlus },
      ]
    : [];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">
            Business overview and key metrics
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="size-4 rounded" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* Revenue This Month */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Revenue This Month
                  </CardTitle>
                  <DollarSign className="size-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(kpis?.revenueThisMonth || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {kpis && kpis.revenueGrowth >= 0 ? (
                      <TrendingUp className="size-3 text-green-600" />
                    ) : (
                      <TrendingDown className="size-3 text-red-600" />
                    )}
                    {formatPercentage(kpis?.revenueGrowth || 0)} from last month
                  </p>
                </CardContent>
              </Card>

              {/* Outstanding Balance */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Outstanding Balance
                  </CardTitle>
                  <Clock className="size-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(kpis?.outstandingBalance || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis?.overdueInvoices || 0} overdue invoice(s)
                  </p>
                </CardContent>
              </Card>

              {/* Active Jobs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Jobs
                  </CardTitle>
                  <Briefcase className="size-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis?.activeJobs || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis?.jobCompletionRate.toFixed(0) || 0}% completion rate
                  </p>
                </CardContent>
              </Card>

              {/* Estimate Conversion */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Estimate Conversion
                  </CardTitle>
                  <FileText className="size-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {kpis?.estimateConversionRate.toFixed(0) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis?.approvedEstimates || 0} of {kpis?.totalEstimates || 0} approved
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue for the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.monthlyRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Job Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Job Status Distribution</CardTitle>
              <CardDescription>Current job status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={jobStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {jobStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice Aging & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Aging */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Aging</CardTitle>
              <CardDescription>Outstanding balance by age</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={invoiceAgingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="amount" fill="#f59e0b" name="Outstanding Amount" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Business Summary</CardTitle>
              <CardDescription>Key business metrics overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="font-semibold">
                      {formatCurrency(kpis?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Jobs</span>
                    <span className="font-semibold">{kpis?.totalJobs || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed Jobs</span>
                    <span className="font-semibold">{kpis?.completedJobs || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Estimates</span>
                    <span className="font-semibold">{kpis?.totalEstimates || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Approved Estimates</span>
                    <span className="font-semibold">{kpis?.approvedEstimates || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-sm font-medium text-destructive">
                      Overdue Amount
                    </span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(kpis?.overdueAmount || 0)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
