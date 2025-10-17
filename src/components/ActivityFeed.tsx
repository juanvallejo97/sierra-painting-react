/**
 * Activity Feed Component
 *
 * Displays a chronological list of activities
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import {
  Activity,
  ActivityType,
  getActivityIcon,
} from '../lib/activity/activity-tracker';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Activity Feed Props
 */
interface ActivityFeedProps {
  limitCount?: number;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  showFilters?: boolean;
  className?: string;
}

/**
 * Activity Item Component
 */
function ActivityItem({ activity }: { activity: Activity }) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to resource if available
    if (activity.resourceType && activity.resourceId) {
      const routes: Record<string, string> = {
        job: `/jobs/${activity.resourceId}`,
        invoice: `/invoices/${activity.resourceId}`,
        timeEntry: `/time-entries`,
        user: `/employees`,
      };

      const route = routes[activity.resourceType];
      if (route) {
        navigate(route);
      }
    }
  };

  const timeAgo = activity.timestamp
    ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })
    : '';

  const fullDate = activity.timestamp
    ? format(activity.timestamp.toDate(), 'PPpp')
    : '';

  return (
    <div
      className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
        {activity.icon || getActivityIcon(activity.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {activity.title}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {activity.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span title={fullDate}>{timeAgo}</span>
          {activity.resourceName && (
            <>
              <span>•</span>
              <span>{activity.resourceName}</span>
            </>
          )}
        </div>

        {/* Changes (if any) */}
        {activity.changes && activity.changes.length > 0 && (
          <div className="mt-2 text-xs">
            {activity.changes.map((change, index) => (
              <div key={index} className="text-gray-500">
                <span className="font-medium">{change.field}:</span>
                {change.oldValue && (
                  <span className="ml-1 line-through text-red-600">
                    {String(change.oldValue)}
                  </span>
                )}
                {change.newValue && (
                  <span className="ml-1 text-green-600">
                    {String(change.newValue)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Activity Feed Component
 */
export default function ActivityFeed({
  limitCount = 50,
  resourceType,
  resourceId,
  userId,
  showFilters = false,
  className = '',
}: ActivityFeedProps) {
  const { userData } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ActivityType | ''>('');

  // Real-time activity feed subscription
  useEffect(() => {
    if (!userData?.companyId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let q = query(
      collection(db, 'activityFeed'),
      where('companyId', '==', userData.companyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    if (resourceType) {
      q = query(q, where('resourceType', '==', resourceType));
    }

    if (resourceId) {
      q = query(q, where('resourceId', '==', resourceId));
    }

    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    if (filterType) {
      q = query(q, where('type', '==', filterType));
    }

    const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
      const acts: Activity[] = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Activity
      );

      setActivities(acts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.companyId, limitCount, resourceType, resourceId, userId, filterType]);

  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = activity.timestamp?.toDate();
      if (!date) return groups;

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = format(date, 'MMMM d, yyyy');
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);

      return groups;
    },
    {} as Record<string, Activity[]>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with filters */}
      {showFilters && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Activity Feed</h2>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActivityType | '')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Activities</option>
            <optgroup label="Jobs">
              <option value={ActivityType.JOB_CREATED}>Created</option>
              <option value={ActivityType.JOB_UPDATED}>Updated</option>
              <option value={ActivityType.JOB_ASSIGNED}>Assigned</option>
              <option value={ActivityType.JOB_STATUS_CHANGED}>Status Changed</option>
              <option value={ActivityType.JOB_COMPLETED}>Completed</option>
            </optgroup>
            <optgroup label="Invoices">
              <option value={ActivityType.INVOICE_CREATED}>Created</option>
              <option value={ActivityType.INVOICE_PAID}>Paid</option>
              <option value={ActivityType.INVOICE_SENT}>Sent</option>
            </optgroup>
            <optgroup label="Time Entries">
              <option value={ActivityType.TIME_ENTRY_APPROVED}>Approved</option>
              <option value={ActivityType.TIME_ENTRY_REJECTED}>Rejected</option>
            </optgroup>
            <optgroup label="Users">
              <option value={ActivityType.USER_JOINED}>Joined</option>
              <option value={ActivityType.USER_ROLE_CHANGED}>Role Changed</option>
            </optgroup>
          </select>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading activities...
        </div>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-gray-500">No activities yet</p>
        </div>
      )}

      {/* Grouped Activities */}
      {!loading && activities.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, acts]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {date}
              </h3>
              <div className="space-y-1 border-l-2 border-gray-200 pl-2">
                {acts.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Activity Feed Compact
 * Smaller version for sidebars/widgets
 */
export function ActivityFeedCompact({
  limitCount = 10,
  className = '',
}: {
  limitCount?: number;
  className?: string;
}) {
  const { userData } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData?.companyId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'activityFeed'),
      where('companyId', '==', userData.companyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const acts: Activity[] = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Activity
      );

      setActivities(acts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.companyId, limitCount]);

  if (loading) {
    return <div className={`text-sm text-gray-500 ${className}`}>Loading...</div>;
  }

  if (activities.length === 0) {
    return <div className={`text-sm text-gray-500 ${className}`}>No recent activity</div>;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {activities.map((activity) => {
        const timeAgo = activity.timestamp
          ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })
          : '';

        return (
          <div
            key={activity.id}
            className="flex items-start gap-2 text-sm hover:bg-gray-50 p-2 rounded cursor-pointer"
            onClick={() => navigate('/activity')}
          >
            <span className="text-lg">
              {activity.icon || getActivityIcon(activity.type)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-medium truncate">
                {activity.title}
              </p>
              <p className="text-xs text-gray-500">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
