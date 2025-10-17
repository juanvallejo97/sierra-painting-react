/**
 * Mobile Time Clock Screen
 *
 * Mobile-optimized time clock interface with large touch buttons,
 * GPS validation, photo capture, and offline support.
 */

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Clock,
  MapPin,
  Camera,
  Coffee,
  LogIn,
  LogOut,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  useActiveTimeSession,
  useCreateTimeClockEntry,
  useTodayTimeSummary,
  useOfflineQueueCount,
  useSyncOfflineQueue,
} from '../../hooks/useMobileTimeClock';
import { useGeolocation, useJobSiteProximity } from '../../hooks/useGeolocation';
import { useJobAssignments } from '../../hooks/useScheduler';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export function MobileTimeClockScreen() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hooks
  const { data: activeSession, isLoading: sessionLoading } = useActiveTimeSession();
  const { data: todaySummary } = useTodayTimeSummary();
  const createEntry = useCreateTimeClockEntry();
  const syncQueue = useSyncOfflineQueue();
  const offlineCount = useOfflineQueueCount();
  const {
    coordinates,
    loading: locationLoading,
    error: locationError,
    getCurrentPosition,
  } = useGeolocation(false);

  // Get today's assignments
  const today = new Date();
  const { data: assignments } = useJobAssignments(today, today);
  const todayAssignments = assignments?.filter((a) => a.status === 'scheduled');

  // Auto-select job if there's only one assignment today
  useEffect(() => {
    if (!selectedJobId && todayAssignments && todayAssignments.length === 1) {
      setSelectedJobId(todayAssignments[0].jobId);
    }
  }, [todayAssignments, selectedJobId]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineCount > 0) {
        toast.info('Back online! Syncing pending entries...');
        syncQueue.mutate();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Entries will be synced when connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineCount, syncQueue]);

  // Format time
  const formatElapsedTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Handle clock in
  const handleClockIn = async () => {
    if (!selectedJobId) {
      toast.error('Please select a job first');
      return;
    }

    getCurrentPosition();

    try {
      const selectedJob = todayAssignments?.find((a) => a.jobId === selectedJobId);

      await createEntry.mutateAsync({
        action: 'clock-in',
        jobId: selectedJobId,
        jobTitle: selectedJob?.jobTitle,
        location: coordinates || undefined,
        photoBase64: photoBase64 || undefined,
        validated: !!coordinates,
      });

      setPhotoBase64(null);
      toast.success('Clocked in successfully!');
    } catch (error) {
      console.error('Clock in failed:', error);
      toast.error('Failed to clock in');
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    getCurrentPosition();

    try {
      await createEntry.mutateAsync({
        action: 'clock-out',
        jobId: activeSession?.clockInEntry.jobId,
        jobTitle: activeSession?.clockInEntry.jobTitle,
        location: coordinates || undefined,
        photoBase64: photoBase64 || undefined,
        validated: !!coordinates,
      });

      setPhotoBase64(null);
      setSelectedJobId(null);
      toast.success('Clocked out successfully!');
    } catch (error) {
      console.error('Clock out failed:', error);
      toast.error('Failed to clock out');
    }
  };

  // Handle break start
  const handleBreakStart = async () => {
    try {
      await createEntry.mutateAsync({
        action: 'break-start',
        jobId: activeSession?.clockInEntry.jobId,
        jobTitle: activeSession?.clockInEntry.jobTitle,
      });

      toast.success('Break started');
    } catch (error) {
      console.error('Break start failed:', error);
      toast.error('Failed to start break');
    }
  };

  // Handle break end
  const handleBreakEnd = async () => {
    try {
      await createEntry.mutateAsync({
        action: 'break-end',
        jobId: activeSession?.clockInEntry.jobId,
        jobTitle: activeSession?.clockInEntry.jobTitle,
      });

      toast.success('Break ended');
    } catch (error) {
      console.error('Break end failed:', error);
      toast.error('Failed to end break');
    }
  };

  // Start camera for photo
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast.error('Failed to access camera');
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg');
        setPhotoBase64(base64);
        stopCamera();
        toast.success('Photo captured');
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl">Time Clock</h1>
            <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>

          {/* Online/Offline Indicator */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            {offlineCount > 0 && (
              <Badge variant="secondary">{offlineCount} pending</Badge>
            )}
          </div>
        </div>

        {/* Today's Summary */}
        {todaySummary && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {formatElapsedTime(todaySummary.workedMinutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">Worked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatElapsedTime(todaySummary.breakMinutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">Break</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatElapsedTime(todaySummary.totalMinutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Session Timer */}
        {activeSession && (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-6 w-6 text-primary animate-pulse" />
                  <span className="text-lg font-semibold">
                    {activeSession.isOnBreak ? 'On Break' : 'Clocked In'}
                  </span>
                </div>
                <div className="text-4xl font-bold tabular-nums">
                  {formatElapsedTime(
                    activeSession.isOnBreak
                      ? activeSession.breakMinutes
                      : activeSession.elapsedMinutes
                  )}
                </div>
                {activeSession.clockInEntry.jobTitle && (
                  <div className="text-sm text-muted-foreground">
                    {activeSession.clockInEntry.jobTitle}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Status */}
        {!activeSession && locationLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Getting your location...</AlertDescription>
          </Alert>
        )}

        {!activeSession && locationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}

        {!activeSession && coordinates && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Location verified • Accuracy: {Math.round(coordinates.accuracy)}m
            </AlertDescription>
          </Alert>
        )}

        {/* Job Selection */}
        {!activeSession && todayAssignments && todayAssignments.length > 0 && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Select Job Site</span>
              </div>
              <div className="space-y-2">
                {todayAssignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() => setSelectedJobId(assignment.jobId)}
                    className={cn(
                      'w-full p-4 border rounded-lg text-left transition-colors',
                      selectedJobId === assignment.jobId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    <div className="font-medium">{assignment.jobTitle}</div>
                    {assignment.startTime && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {assignment.startTime} - {assignment.endTime || 'End'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Capture */}
        {!showCamera && !photoBase64 && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={startCamera}
          >
            <Camera className="h-5 w-5 mr-2" />
            Add Photo (Optional)
          </Button>
        )}

        {showCamera && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {photoBase64 && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <img src={photoBase64} alt="Captured" className="w-full rounded-lg" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoBase64(null)}
                className="w-full"
              >
                Remove Photo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Main Action Buttons */}
        <div className="space-y-3 pt-4">
          {!activeSession ? (
            <Button
              size="lg"
              className="w-full h-20 text-2xl"
              onClick={handleClockIn}
              disabled={!selectedJobId || createEntry.isPending || sessionLoading}
            >
              {createEntry.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-8 w-8 mr-3" />
                  Clock In
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Break Buttons */}
              {activeSession.isOnBreak ? (
                <Button
                  size="lg"
                  variant="default"
                  className="w-full h-16 text-xl"
                  onClick={handleBreakEnd}
                  disabled={createEntry.isPending}
                >
                  <Coffee className="h-6 w-6 mr-3" />
                  End Break
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-16 text-xl"
                  onClick={handleBreakStart}
                  disabled={createEntry.isPending}
                >
                  <Coffee className="h-6 w-6 mr-3" />
                  Start Break
                </Button>
              )}

              {/* Clock Out Button */}
              <Button
                size="lg"
                variant="destructive"
                className="w-full h-20 text-2xl"
                onClick={handleClockOut}
                disabled={createEntry.isPending || activeSession.isOnBreak}
              >
                {createEntry.isPending ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-8 w-8 mr-3" />
                    Clock Out
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Info Alert */}
        {activeSession?.isOnBreak && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must end your break before clocking out
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppLayout>
  );
}
