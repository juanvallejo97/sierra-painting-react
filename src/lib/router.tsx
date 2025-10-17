import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, isAdmin, isManager, isWorker } from './auth-context';
import { Loader2 } from 'lucide-react';

/**
 * Loading screen component
 */
export function LoadingScreen() {
  console.log('LoadingScreen rendering');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Protected route - requires authentication
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Public route - redirects authenticated users to dashboard
 */
export function PublicRoute() {
  const { user, loading } = useAuth();

  console.log('PublicRoute - user:', user?.email, 'loading:', loading);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    console.log('User authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('No user, rendering public route');
  return <Outlet />;
}

/**
 * Admin-only route guard
 */
export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin(user.role) && !isManager(user.role)) {
    return <Navigate to="/worker/home" replace />;
  }

  return <Outlet />;
}

/**
 * Worker-only route guard
 */
export function WorkerRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isWorker(user.role)) {
    return <Navigate to="/admin/home" replace />;
  }

  return <Outlet />;
}

/**
 * Dashboard router - redirects to appropriate dashboard based on role
 */
export function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin(user.role) || isManager(user.role)) {
    return <Navigate to="/admin/home" replace />;
  }

  if (isWorker(user.role)) {
    return <Navigate to="/worker/home" replace />;
  }

  // No role assigned - redirect to no-role page
  return <Navigate to="/no-role" replace />;
}
