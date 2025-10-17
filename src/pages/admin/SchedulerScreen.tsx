/**
 * Scheduler Screen
 *
 * Visual calendar interface for managing job assignments, crew scheduling,
 * and employee availability. Includes conflict detection and crew templates.
 */

import { useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Plus,
  AlertCircle,
  Clock,
  Briefcase,
  X,
  CheckCircle,
} from 'lucide-react';
import {
  useJobAssignments,
  useTimeOffRequests,
  useCrewTemplates,
  useDeleteJobAssignment,
} from '../../hooks/useScheduler';
import type {
  JobAssignment,
  CrewTemplate,
} from '../../hooks/useScheduler';
import { useJobs } from '../../hooks/useJobs';
import { useEmployees } from '../../hooks/useEmployees';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { CreateJobAssignmentDialog } from '../../components/dialogs/CreateJobAssignmentDialog';
import { CreateCrewTemplateDialog } from '../../components/dialogs/CreateCrewTemplateDialog';

type ViewMode = 'week' | 'day';

export function SchedulerScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCrewTemplateDialog, setShowCrewTemplateDialog] = useState(false);

  // Calculate date range based on view mode
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
  const daysInView = eachDayOfInterval({ start: startDate, end: endDate });

  // Fetch data
  const { data: assignments, isLoading: assignmentsLoading } = useJobAssignments(startDate, endDate);
  const { data: timeOffRequests, isLoading: timeOffLoading } = useTimeOffRequests('approved');
  const { data: crewTemplates } = useCrewTemplates();
  const { data: jobs } = useJobs();
  const { data: employees } = useEmployees();

  const deleteAssignment = useDeleteJobAssignment();

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDeleteAssignment = async (assignmentId: string, employeeName: string) => {
    if (window.confirm(`Remove ${employeeName} from this assignment?`)) {
      try {
        await deleteAssignment.mutateAsync(assignmentId);
        toast.success('Assignment removed successfully');
      } catch (error) {
        console.error('Failed to delete assignment:', error);
        toast.error('Failed to remove assignment');
      }
    }
  };

  // Group assignments by date and employee
  const assignmentsByDate = new Map<string, JobAssignment[]>();
  assignments?.forEach((assignment) => {
    const key = assignment.assignedDate;
    if (!assignmentsByDate.has(key)) {
      assignmentsByDate.set(key, []);
    }
    assignmentsByDate.get(key)!.push(assignment);
  });

  // Check if employee has time off on a given date
  const hasTimeOff = (employeeId: string, date: Date): boolean => {
    return (timeOffRequests || []).some((request) => {
      const startDate = parseISO(request.startDate);
      const endDate = parseISO(request.endDate);
      return (
        request.employeeId === employeeId &&
        isWithinInterval(date, { start: startDate, end: endDate })
      );
    });
  };

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date): JobAssignment[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return assignmentsByDate.get(dateKey) || [];
  };

  // Get assignments for a specific employee on a date
  const getEmployeeAssignments = (employeeId: string, date: Date): JobAssignment[] => {
    return getAssignmentsForDate(date).filter((a) => a.employeeId === employeeId);
  };

  const isLoading = assignmentsLoading || timeOffLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Scheduler</h1>
            <p className="text-muted-foreground">
              Manage job assignments and crew scheduling
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowCrewTemplateDialog(true)}>
              <Users className="h-4 w-4 mr-2" />
              New Crew Template
            </Button>

            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="day">Day View</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  {assignments?.length || 0} Assignments
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {employees?.length || 0} Employees
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Days of Week Headers */}
                <div className="grid grid-cols-7 gap-2">
                  {daysInView.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'text-center p-3 border rounded-lg',
                        isSameDay(day, new Date()) && 'bg-primary/10 border-primary'
                      )}
                    >
                      <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                      <div className="text-2xl font-bold">{format(day, 'd')}</div>
                      <div className="text-xs text-muted-foreground">{format(day, 'MMM')}</div>
                    </div>
                  ))}
                </div>

                {/* Employee Rows */}
                <div className="space-y-4">
                  {employees && employees.length > 0 ? (
                    employees.map((employee) => (
                      <div key={employee.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold">
                              {employee.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {employee.role}
                            </p>
                          </div>
                        </div>

                        {/* Weekly Schedule for Employee */}
                        <div className="grid grid-cols-7 gap-2">
                          {daysInView.map((day) => {
                            const dayAssignments = getEmployeeAssignments(employee.id, day);
                            const onTimeOff = hasTimeOff(employee.id, day);

                            return (
                              <div
                                key={day.toISOString()}
                                className={cn(
                                  'min-h-[80px] p-2 border rounded-lg',
                                  onTimeOff && 'bg-orange-50 border-orange-200'
                                )}
                              >
                                {onTimeOff ? (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <Clock className="h-3 w-3" />
                                    <span>Time Off</span>
                                  </div>
                                ) : dayAssignments.length > 0 ? (
                                  <div className="space-y-1">
                                    {dayAssignments.map((assignment) => (
                                      <div
                                        key={assignment.id}
                                        className="group relative bg-blue-50 border border-blue-200 rounded p-2 text-xs"
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                              {assignment.jobTitle}
                                            </p>
                                            {assignment.startTime && (
                                              <p className="text-muted-foreground">
                                                {assignment.startTime}
                                              </p>
                                            )}
                                            {assignment.role && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] h-4 mt-1"
                                              >
                                                {assignment.role}
                                              </Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() =>
                                              handleDeleteAssignment(
                                                assignment.id,
                                                employee.name
                                              )
                                            }
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setSelectedDate(day);
                                        setSelectedEmployee(employee.id);
                                        setShowAssignDialog(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Assign
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No employees found. Add employees to start scheduling.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Crew Templates
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{crewTemplates?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Quick assignment templates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Jobs
              </CardTitle>
              <Briefcase className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobs?.filter((j) => j.status !== 'completed').length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for scheduling
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Time Off Requests
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeOffRequests?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Approved this period</p>
            </CardContent>
          </Card>
        </div>

        {/* Crew Templates Section */}
        {crewTemplates && crewTemplates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Crew Templates
              </CardTitle>
              <CardDescription>
                Quick-apply saved crew configurations to jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crewTemplates.map((template: CrewTemplate) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{template.name}</h4>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {template.employees?.length || 0} crew
                      </Badge>
                    </div>
                    {template.jobType && (
                      <Badge variant="outline" className="text-xs">
                        {template.jobType}
                      </Badge>
                    )}
                    <div className="mt-3 space-y-1">
                      {template.employees?.slice(0, 3).map((emp) => (
                        <div key={emp.id} className="text-xs flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{emp.name}</span>
                          <span className="text-muted-foreground">({emp.role})</span>
                        </div>
                      ))}
                      {template.employees && template.employees.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{template.employees.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CreateJobAssignmentDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        preselectedDate={selectedDate}
        preselectedEmployee={selectedEmployee}
      />

      <CreateCrewTemplateDialog
        open={showCrewTemplateDialog}
        onOpenChange={setShowCrewTemplateDialog}
      />
    </AppLayout>
  );
}
