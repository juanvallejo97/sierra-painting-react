import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Clock,
  Briefcase,
  DollarSign,
  FileText,
  Users,
  Settings,
  Calendar,
  LogOut,
  Receipt,
  CalendarClock,
} from 'lucide-react';
import { useAuth, isAdmin, isManager } from '../../lib/auth-context';
import { Button } from '../ui/button';
import { Logo } from '../ui/logo';
import { cn } from '../../lib/utils';
import type { NavItem } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const userIsAdmin = isAdmin(user?.role);
  const userIsManager = isManager(user?.role);

  // Build navigation items based on user role
  const navItems: NavItem[] = React.useMemo(() => {
    if (userIsAdmin || userIsManager) {
      return [
        { icon: Home, label: 'Dashboard', path: '/admin/home' },
        { icon: Clock, label: 'Review Time', path: '/admin/review' },
        { icon: Receipt, label: 'Payroll', path: '/admin/payroll' },
        { icon: CalendarClock, label: 'Scheduler', path: '/admin/scheduler' },
        { icon: Briefcase, label: 'Jobs', path: '/jobs' },
        { icon: DollarSign, label: 'Invoices', path: '/invoices' },
        { icon: FileText, label: 'Estimates', path: '/estimates' },
        { icon: Users, label: 'Employees', path: '/employees' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ];
    }

    // Worker navigation
    return [
      { icon: Home, label: 'Home', path: '/worker/home' },
      { icon: Clock, label: 'Time Clock', path: '/worker/timeclock' },
      { icon: Calendar, label: 'Schedule', path: '/worker/schedule' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ];
  }, [userIsAdmin, userIsManager]);

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <h1 className="font-bold text-lg leading-none">D'Sierra</h1>
              <p className="text-xs text-muted-foreground">Painting</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.displayName || user?.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSignOut}
            leftIcon={<LogOut className="size-4" />}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
