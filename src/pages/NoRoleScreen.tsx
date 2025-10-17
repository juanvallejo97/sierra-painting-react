import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { Logo } from '../components/ui/logo';

export function NoRoleScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshUser();
      window.location.reload();
    } catch (err) {
      console.error('Failed to refresh user:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertCircle className="size-8 text-warning" />
            </div>
          </div>
          <CardTitle className="text-2xl">No Role Assigned</CardTitle>
          <CardDescription>
            Your account doesn't have a role assigned yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">What's next?</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Contact your administrator to assign you a role</li>
                  <li>Once assigned, click "Refresh Role Status" below</li>
                  <li>You'll be redirected to your dashboard</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="text-sm">
              <strong className="text-foreground">Email:</strong>{' '}
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <div className="text-sm">
              <strong className="text-foreground">User ID:</strong>{' '}
              <span className="text-muted-foreground font-mono text-xs">
                {user?.uid}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full"
              onClick={handleRefresh}
              disabled={isRefreshing}
              loading={isRefreshing}
              loadingText="Checking status..."
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh Role Status
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSignOut}
              disabled={isRefreshing}
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Need help? Contact your system administrator with your User ID above.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
