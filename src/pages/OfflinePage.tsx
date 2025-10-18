/**
 * Offline Fallback Page
 *
 * Displayed when the user navigates while offline and the requested page
 * is not cached in the service worker.
 */

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useOfflineStatus } from '../lib/offline';

export function OfflinePage() {
  const navigate = useNavigate();
  const { isOnline, status } = useOfflineStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-redirect to home when connection is restored
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);

    // Wait a moment to allow connection check
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Force reload to retry
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100">
            <WifiOff className="size-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription>
            {status === 'unstable'
              ? 'Your connection is unstable. Some features may not be available.'
              : 'No internet connection detected. Please check your network and try again.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection status */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Status</span>
              <div className="flex items-center gap-2">
                <div
                  className={`size-2 rounded-full ${
                    status === 'online'
                      ? 'bg-green-500'
                      : status === 'unstable'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="text-sm capitalize">{status}</span>
              </div>
            </div>
          </div>

          {/* Offline features info */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">What you can do offline:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>View recently accessed pages from cache</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Changes will be synced when you're back online</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Access downloaded data and reports</span>
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} disabled={isRetrying} className="w-full" size="lg">
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 size-4" />
                  Retry Connection
                </>
              )}
            </Button>

            <Button onClick={handleGoHome} variant="outline" className="w-full" size="lg">
              <Home className="mr-2 size-4" />
              Go to Dashboard
            </Button>
          </div>

          {/* Troubleshooting tips */}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
              Troubleshooting tips
            </summary>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>Check if other devices can connect to the internet</span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>Try turning Wi-Fi off and on again</span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>Check if airplane mode is disabled</span>
              </li>
              <li className="flex items-start gap-2">
                <span>4.</span>
                <span>Restart your router or modem</span>
              </li>
            </ul>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
