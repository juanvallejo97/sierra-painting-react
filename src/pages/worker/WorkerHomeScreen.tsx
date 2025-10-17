import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Clock, MapPin, Calendar, Play, Square } from 'lucide-react';
import { useUser } from '../../store/auth-store';
import { useTimerPersistence } from '../../hooks/use-timer-persistence';

export function WorkerHomeScreen() {
  const user = useUser();
  const { isClockedIn, currentTime, handleClockIn, handleClockOut } = useTimerPersistence();

  // Mock current job data
  const currentJob = {
    id: '1',
    name: 'Smith Residence - Interior Paint',
    address: '123 Main St, Sacramento, CA',
    startTime: '8:00 AM',
    estimatedEnd: '4:00 PM',
  };

  // Mock upcoming jobs
  const upcomingJobs = [
    {
      id: '2',
      name: 'Johnson Office Building',
      date: 'Tomorrow',
      time: '9:00 AM',
    },
    {
      id: '3',
      name: 'Davis Home - Exterior',
      date: 'Friday',
      time: '8:00 AM',
    },
  ];

  const handleClockToggle = () => {
    if (isClockedIn) {
      if (window.confirm('Are you sure you want to clock out?')) {
        handleClockOut();
      }
    } else {
      handleClockIn();
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1>Welcome back, {user?.displayName || 'Worker'}!</h1>
          <p className="text-muted-foreground">
            {isClockedIn ? 'You are currently clocked in' : 'Ready to start your day?'}
          </p>
        </div>

        {/* Timeclock Card */}
        <Card variant="gradient">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Timeclock</span>
              <Badge variant={isClockedIn ? 'default' : 'secondary'}>
                {isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isClockedIn && (
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">{currentTime}</div>
                <p className="text-sm text-muted-foreground">Hours worked today</p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              variant={isClockedIn ? 'destructive' : 'default'}
              onClick={handleClockToggle}
              leftIcon={isClockedIn ? <Square className="size-5" /> : <Play className="size-5" />}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>

            {!isClockedIn && (
              <p className="text-xs text-center text-muted-foreground">
                Make sure you're at the job site before clocking in
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Job */}
        {currentJob && (
          <Card>
            <CardHeader>
              <CardTitle>Today's Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold">{currentJob.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="size-4" />
                  {currentJob.address}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>
                    {currentJob.startTime} - {currentJob.estimatedEnd}
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                View Job Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="size-3" />
                      {job.date} at {job.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
