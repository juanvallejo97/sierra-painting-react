/**
 * Payroll Reports Screen
 *
 * Displays comprehensive payroll reports with employee hours, pay calculations,
 * and job cost breakdowns. Supports CSV and PDF export.
 */

import { useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
  AlertCircle,
  DollarSign,
  Clock,
  Users,
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  Briefcase,
} from 'lucide-react';
import {
  usePayrollReport,
  downloadPayrollCSV,
} from '../../hooks/usePayrollReports';
import type {
  DateRangePreset,
  EmployeePayrollSummary,
  JobCostBreakdown,
} from '../../hooks/usePayrollReports';
import { downloadPayrollPDF } from '../../utils/payroll-pdf';
import { getDefaultCompanyInfo } from '../../utils/invoice-pdf';
import { useCompany, companyToCompanyInfo } from '../../hooks/useCompany';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function PayrollReportsScreen() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('this-month');
  const { data: report, isLoading, error } = usePayrollReport(datePreset);
  const { data: company } = useCompany();

  const handleExportCSV = () => {
    if (!report) {
      toast.error('No data to export');
      return;
    }

    try {
      downloadPayrollCSV(report);
      toast.success('Payroll report exported to CSV');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    if (!report) {
      toast.error('No data to export');
      return;
    }

    try {
      const companyInfo = company ? companyToCompanyInfo(company) : getDefaultCompanyInfo();
      await downloadPayrollPDF(report, companyInfo);
      toast.success('Payroll report exported to PDF');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load payroll report: {(error as Error).message}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Payroll Reports</h1>
            <p className="text-muted-foreground">
              Employee hours, pay calculations, and job cost analysis
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={datePreset}
              onValueChange={(value) => setDatePreset(value as DateRangePreset)}
            >
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExportCSV} disabled={!report || isLoading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <Button variant="outline" onClick={handleExportPDF} disabled={!report || isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Date Range Display */}
        {report && (
          <div className="text-sm text-muted-foreground">
            Period: {format(report.dateRange.startDate, 'MMM dd, yyyy')} -{' '}
            {format(report.dateRange.endDate, 'MMM dd, yyyy')}
          </div>
        )}

        {/* Summary KPI Cards */}
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
              {/* Total Pay */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Payroll
                  </CardTitle>
                  <DollarSign className="size-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report?.summary.totalPay || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report?.summary.approvedEntries || 0} approved entries
                  </p>
                </CardContent>
              </Card>

              {/* Total Hours */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Hours
                  </CardTitle>
                  <Clock className="size-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatHours(report?.summary.totalHours || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report?.summary.entriesCount || 0} time entries
                  </p>
                </CardContent>
              </Card>

              {/* Employees */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Employees
                  </CardTitle>
                  <Users className="size-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report?.summary.employeeCount || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">worked this period</p>
                </CardContent>
              </Card>

              {/* Pending Approvals */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Approvals
                  </CardTitle>
                  <FileText className="size-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report?.summary.pendingEntries || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">awaiting approval</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Employee Payroll Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Payroll Summary
            </CardTitle>
            <CardDescription>Hours worked and pay breakdown by employee</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : report && report.employees.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total Pay</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Jobs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.employees.map((employee: EmployeePayrollSummary) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium">{employee.employeeName}</TableCell>
                        <TableCell className="text-right">
                          {formatHours(employee.totalHours)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(employee.hourlyRate)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(employee.totalPay)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{employee.entriesCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {employee.jobsWorked.length}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatHours(report.summary.totalHours)}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(report.summary.totalPay)}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.summary.entriesCount}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No time entries found for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Cost Analysis
            </CardTitle>
            <CardDescription>Labor costs breakdown by job</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : report && report.jobCosts.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Labor Cost</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Avg Cost/Hour</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.jobCosts.map((job: JobCostBreakdown) => (
                      <TableRow key={job.jobId}>
                        <TableCell className="font-medium">{job.jobTitle}</TableCell>
                        <TableCell className="text-right">
                          {formatHours(job.totalHours)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(job.totalLaborCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{job.employeeCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {job.totalHours > 0
                            ? formatCurrency(job.totalLaborCost / job.totalHours)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatHours(report.summary.totalHours)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(report.summary.totalPay)}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.summary.employeeCount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {report.summary.totalHours > 0
                          ? formatCurrency(report.summary.totalPay / report.summary.totalHours)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No job costs found for the selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
