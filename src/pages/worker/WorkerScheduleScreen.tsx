import { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Navigation } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useSchedule, useTodaysSchedule, useWeekSchedule, type ScheduleItem } from '../../hooks/useSchedule';

export function WorkerScheduleScreen() {
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');

  // Use the appropriate hook based on filter
  const todayQuery = useTodaysSchedule();
  const weekQuery = useWeekSchedule();
  const allQuery = useSchedule('all');

  const { data: schedule = [], isLoading, error } =
    filter === 'today' ? todayQuery :
    filter === 'week' ? weekQuery :
    allQuery;

  const getStatusColor = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'in-progress':
        return 'default';
      case 'upcoming':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: ScheduleItem['status']) => {
    return status.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleGetDirections = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const groupedSchedule = schedule.reduce((acc, item) => {
    if (!acc[item.dateLabel]) {
      acc[item.dateLabel] = [];
    }
    acc[item.dateLabel].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>My Schedule</h1>
            <p className="text-muted-foreground">View your upcoming job assignments</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load your schedule. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as 'today' | 'week' | 'all')}>
          <TabsList>
            <TabsTrigger value="today">
              Today
            </TabsTrigger>
            <TabsTrigger value="week">
              This Week
            </TabsTrigger>
            <TabsTrigger value="all">
              All Upcoming
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={CalendarIcon}
            title="No scheduled jobs"
            description={
              filter === 'today'
                ? 'You have no jobs scheduled for today. Enjoy your day off!'
                : filter === 'week'
                ? 'You have no jobs scheduled for this week.'
                : 'You have no upcoming job assignments.'
            }
          />
        ) : (
          /* Schedule List */
          <div className="space-y-6">
            {Object.entries(groupedSchedule).map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{dateLabel}</h2>
                  {dateLabel === 'Today' && (
                    <Badge variant="default">TODAY</Badge>
                  )}
                </div>

                {/* Schedule Items */}
                <div className="grid gap-3">
                  {items.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          {/* Job Info */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">
                                {item.job.name}
                              </h3>
                              <Badge variant={getStatusColor(item.status)}>
                                {formatStatus(item.status)}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              {/* Address */}
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <MapPin className="size-4 mt-0.5 flex-shrink-0" />
                                <span>{item.job.address}</span>
                              </div>

                              {/* Time */}
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="size-4 flex-shrink-0" />
                                <span>{item.time}</span>
                              </div>

                              {/* Description */}
                              {item.job.description && (
                                <p className="text-muted-foreground mt-2">
                                  {item.job.description}
                                </p>
                              )}

                              {/* Notes */}
                              {item.job.notes && (
                                <div className="mt-2 p-3 bg-muted rounded-md">
                                  <p className="text-sm">
                                    <strong>Notes:</strong> {item.job.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGetDirections(item.job.address)}
                            >
                              <Navigation className="size-4 mr-2" />
                              Directions
                            </Button>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        {!isLoading && schedule.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground p-4 bg-muted rounded-lg">
            <p>
              {schedule.length} job{schedule.length !== 1 ? 's' : ''} scheduled
            </p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-blue-500" />
                Upcoming: {schedule.filter(s => s.status === 'upcoming').length}
              </span>
              <span className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-green-500" />
                In Progress: {schedule.filter(s => s.status === 'in-progress').length}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {filter === 'today' && schedule.length > 0 && (
          <Alert>
            <AlertDescription>
              <strong>Ready to start?</strong> Make sure to clock in when you arrive
              at the job site. Have a great day!
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppLayout>
  );
}
