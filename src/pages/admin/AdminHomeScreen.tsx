import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  DollarSign,
  Briefcase,
  Users,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useUser } from '../../store/auth-store';
import { formatCurrency } from '../../lib/utils';

// Mock KPI data hook - will be replaced with React Query in Phase 2
function useAdminKPIs(companyId?: string) {
  const [loading, setLoading] = React.useState(true);
  const [data] = React.useState({
    revenue: 45280,
    activeJobs: 23,
    pendingInvoices: 8,
    activeWorkers: 12,
  });

  React.useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 800);
  }, [companyId]);

  return { data, loading };
}

export function AdminHomeScreen() {
  const user = useUser();
  const { data: kpis, loading } = useAdminKPIs(user?.companyId);

  const kpiData = [
    {
      title: 'Revenue This Month',
      value: formatCurrency(kpis.revenue),
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Active Jobs',
      value: kpis.activeJobs.toString(),
      change: '+3',
      icon: Briefcase,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Invoices',
      value: kpis.pendingInvoices.toString(),
      change: '-2',
      icon: AlertCircle,
      color: 'text-orange-600',
    },
    {
      title: 'Active Workers',
      value: kpis.activeWorkers.toString(),
      change: '+1',
      icon: Users,
      color: 'text-primary',
    },
  ];

  const quickActions = [
    { label: 'Review Time Entries', path: '/admin/review', icon: Clock },
    { label: 'Create Job', path: '/jobs/create', icon: Briefcase },
    { label: 'New Invoice', path: '/invoices/create', icon: DollarSign },
    { label: 'New Estimate', path: '/estimates/create', icon: DollarSign },
  ];

  const recentActivity = [
    { id: 1, text: 'John Doe clocked in at Smith Residence', time: '2 hours ago' },
    { id: 2, text: 'Invoice #1234 paid - $2,450', time: '3 hours ago' },
    { id: 3, text: 'New estimate requested - Downtown Office', time: '5 hours ago' },
    { id: 4, text: 'Maria Garcia completed Johnson Project', time: '1 day ago' },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1>Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
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
            kpiData.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </CardTitle>
                    <Icon className={`size-4 ${kpi.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.change} from last month
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.path} to={action.path}>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {action.label}
                      </span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="size-2 bg-primary rounded-full mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{item.text}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
