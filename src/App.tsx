import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './lib/auth-context';
import {
  ProtectedRoute,
  PublicRoute,
  AdminRoute,
  WorkerRoute,
  DashboardRouter,
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

// Auth Pages
import { LoginScreen } from './pages/auth/LoginScreen';
import { SignupScreen } from './pages/auth/SignupScreen';
import { ForgotPasswordScreen } from './pages/auth/ForgotPasswordScreen';

// Admin Pages
import { AdminHomeScreen } from './pages/admin/AdminHomeScreen';
import { AdminReviewScreen } from './pages/admin/AdminReviewScreen';
import { PayrollReportsScreen } from './pages/admin/PayrollReportsScreen';
import { SchedulerScreen } from './pages/admin/SchedulerScreen';

// Worker Pages
import { WorkerHomeScreen } from './pages/worker/WorkerHomeScreen';
import { WorkerScheduleScreen } from './pages/worker/WorkerScheduleScreen';
import { MobileTimeClockScreen } from './pages/worker/MobileTimeClockScreen';

// Shared Pages
import { JobsScreen } from './pages/JobsScreen';
import { InvoicesScreen } from './pages/InvoicesScreen';
import { EstimatesScreen } from './pages/EstimatesScreen';
import { EmployeesScreen } from './pages/EmployeesScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import { NoRoleScreen } from './pages/NoRoleScreen';

// Import global styles
import './styles/globals.css';

function App() {
  console.log('App component rendering - full version');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public routes */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
              </Route>

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                {/* Dashboard router - redirects based on role */}
                <Route path="/dashboard" element={<DashboardRouter />} />

                {/* No role page */}
                <Route path="/no-role" element={<NoRoleScreen />} />

                {/* Admin routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/home" element={<AdminHomeScreen />} />
                  <Route path="/admin/review" element={<AdminReviewScreen />} />
                  <Route path="/admin/payroll" element={<PayrollReportsScreen />} />
                  <Route path="/admin/scheduler" element={<SchedulerScreen />} />
                </Route>

                {/* Worker routes */}
                <Route element={<WorkerRoute />}>
                  <Route path="/worker/home" element={<WorkerHomeScreen />} />
                  <Route path="/worker/timeclock" element={<MobileTimeClockScreen />} />
                  <Route path="/worker/schedule" element={<WorkerScheduleScreen />} />
                </Route>

                {/* Shared routes - accessible by all authenticated users */}
                <Route path="/jobs" element={<JobsScreen />} />
                <Route path="/invoices" element={<InvoicesScreen />} />
                <Route path="/estimates" element={<EstimatesScreen />} />
                <Route path="/employees" element={<EmployeesScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
