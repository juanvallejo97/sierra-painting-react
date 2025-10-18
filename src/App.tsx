import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { AuthProvider } from './lib/auth-context';
import { Toaster } from './components/ui/toaster';
import {
  ProtectedRoute,
  PublicRoute,
  AdminRoute,
  WorkerRoute,
  DashboardRouter,
  LoadingScreen,
} from './lib/router';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Lazy load all route components for code splitting
// Auth Pages
const LoginScreen = lazy(() =>
  import('./pages/auth/LoginScreen').then((m) => ({ default: m.LoginScreen })),
);
const SignupScreen = lazy(() =>
  import('./pages/auth/SignupScreen').then((m) => ({ default: m.SignupScreen })),
);
const ForgotPasswordScreen = lazy(() =>
  import('./pages/auth/ForgotPasswordScreen').then((m) => ({ default: m.ForgotPasswordScreen })),
);

// Admin Pages
const AdminHomeScreen = lazy(() =>
  import('./pages/admin/AdminHomeScreen').then((m) => ({ default: m.AdminHomeScreen })),
);
const AdminReviewScreen = lazy(() =>
  import('./pages/admin/AdminReviewScreen').then((m) => ({ default: m.AdminReviewScreen })),
);
const PayrollReportsScreen = lazy(() =>
  import('./pages/admin/PayrollReportsScreen').then((m) => ({ default: m.PayrollReportsScreen })),
);
const SchedulerScreen = lazy(() =>
  import('./pages/admin/SchedulerScreen').then((m) => ({ default: m.SchedulerScreen })),
);

// Worker Pages
const WorkerHomeScreen = lazy(() =>
  import('./pages/worker/WorkerHomeScreen').then((m) => ({ default: m.WorkerHomeScreen })),
);
const WorkerScheduleScreen = lazy(() =>
  import('./pages/worker/WorkerScheduleScreen').then((m) => ({ default: m.WorkerScheduleScreen })),
);
const MobileTimeClockScreen = lazy(() =>
  import('./pages/worker/MobileTimeClockScreen').then((m) => ({
    default: m.MobileTimeClockScreen,
  })),
);

// Shared Pages
const JobsScreen = lazy(() =>
  import('./pages/JobsScreen').then((m) => ({ default: m.JobsScreen })),
);
const InvoicesScreen = lazy(() =>
  import('./pages/InvoicesScreen').then((m) => ({ default: m.InvoicesScreen })),
);
const EstimatesScreen = lazy(() =>
  import('./pages/EstimatesScreen').then((m) => ({ default: m.EstimatesScreen })),
);
const EmployeesScreen = lazy(() =>
  import('./pages/EmployeesScreen').then((m) => ({ default: m.EmployeesScreen })),
);
const SettingsScreen = lazy(() =>
  import('./pages/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const NoRoleScreen = lazy(() =>
  import('./pages/NoRoleScreen').then((m) => ({ default: m.NoRoleScreen })),
);
const OfflinePage = lazy(() =>
  import('./pages/OfflinePage').then((m) => ({ default: m.OfflinePage })),
);

// Import global styles
import './styles/globals.css';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Public routes */}
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<LoginScreen />} />
                  <Route path="/signup" element={<SignupScreen />} />
                  <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                </Route>

                {/* Protected routes with route-level error boundary */}
                <Route element={<ProtectedRoute />}>
                  {/* Dashboard router - redirects based on role */}
                  <Route
                    path="/dashboard"
                    element={
                      <RouteErrorBoundary>
                        <DashboardRouter />
                      </RouteErrorBoundary>
                    }
                  />

                  {/* No role page */}
                  <Route path="/no-role" element={<NoRoleScreen />} />

                  {/* Admin routes with error isolation */}
                  <Route element={<AdminRoute />}>
                    <Route
                      path="/admin/home"
                      element={
                        <RouteErrorBoundary>
                          <AdminHomeScreen />
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="/admin/review"
                      element={
                        <RouteErrorBoundary>
                          <AdminReviewScreen />
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="/admin/payroll"
                      element={
                        <RouteErrorBoundary>
                          <PayrollReportsScreen />
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="/admin/scheduler"
                      element={
                        <RouteErrorBoundary>
                          <SchedulerScreen />
                        </RouteErrorBoundary>
                      }
                    />
                  </Route>

                  {/* Worker routes with error isolation */}
                  <Route element={<WorkerRoute />}>
                    <Route
                      path="/worker/home"
                      element={
                        <RouteErrorBoundary>
                          <WorkerHomeScreen />
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="/worker/timeclock"
                      element={
                        <RouteErrorBoundary>
                          <MobileTimeClockScreen />
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="/worker/schedule"
                      element={
                        <RouteErrorBoundary>
                          <WorkerScheduleScreen />
                        </RouteErrorBoundary>
                      }
                    />
                  </Route>

                  {/* Shared routes with error isolation */}
                  <Route
                    path="/jobs"
                    element={
                      <RouteErrorBoundary>
                        <JobsScreen />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/invoices"
                    element={
                      <RouteErrorBoundary>
                        <InvoicesScreen />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/estimates"
                    element={
                      <RouteErrorBoundary>
                        <EstimatesScreen />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/employees"
                    element={
                      <RouteErrorBoundary>
                        <EmployeesScreen />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <RouteErrorBoundary>
                        <SettingsScreen />
                      </RouteErrorBoundary>
                    }
                  />
                </Route>

                {/* Offline fallback */}
                <Route path="/offline" element={<OfflinePage />} />

                {/* 404 fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
