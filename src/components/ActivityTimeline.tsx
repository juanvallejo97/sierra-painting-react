/**
 * Activity Timeline Component
 *
 * Visual timeline representation of activities
 */

import { useState, useEffect } from 'react';
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
  getActivityIcon,
} from '../lib/activity/activity-tracker';
import { format } from 'date-fns';

/**
 * Timeline Item Component
 */
function TimelineItem({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const time = activity.timestamp
    ? format(activity.timestamp.toDate(), 'h:mm a')
    : '';

  const date = activity.timestamp
    ? format(activity.timestamp.toDate(), 'MMM d')
    : '';

  return (
    <div className="relative flex items-start gap-4 pb-8">
      {/* Vertical Line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200"></div>
      )}

      {/* Icon Circle */}
      <div className="relative z-10 flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl shadow-md">
        {activity.icon || getActivityIcon(activity.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {activity.title}
            </h4>
            <div className="flex flex-col items-end text-xs text-gray-500">
              <span>{time}</span>
              <span>{date}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-2">
            {activity.description}
          </p>

          {/* Resource */}
          {activity.resourceName && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {activity.resourceType}
              </span>
              <span className="text-gray-600">{activity.resourceName}</span>
            </div>
          )}

          {/* Changes */}
          {activity.changes && activity.changes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
              <div className="space-y-1">
                {activity.changes.map((change, index) => (
                  <div key={index} className="text-xs flex items-center gap-2">
                    <span className="font-medium text-gray-600">{change.field}:</span>
                    {change.oldValue && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded">
                        {String(change.oldValue)}
                      </span>
                    )}
                    <span className="text-gray-400">→</span>
                    {change.newValue && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                        {String(change.newValue)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User */}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
              👤
            </div>
            <span>{activity.userName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Activity Timeline Props
 */
interface ActivityTimelineProps {
  limitCount?: number;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  className?: string;
}

/**
 * Activity Timeline Component
 */
export default function ActivityTimeline({
  limitCount = 20,
  resourceType,
  resourceId,
  userId,
  className = '',
}: ActivityTimelineProps) {
  const { userData } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time timeline subscription
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
  }, [userData?.companyId, limitCount, resourceType, resourceId, userId]);

  if (loading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500">Loading timeline...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-5xl mb-3">📅</div>
        <p className="text-gray-500">No timeline data</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {activities.map((activity, index) => (
        <TimelineItem
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}

/**
 * Timeline Milestone
 * Special highlighted timeline item for major events
 */
interface TimelineMilestoneProps {
  title: string;
  description: string;
  date: Date;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

export function TimelineMilestone({
  title,
  description,
  date,
  icon = '⭐',
  color = 'blue',
}: TimelineMilestoneProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className="relative flex items-start gap-4 pb-8">
      {/* Icon Circle - Larger */}
      <div
        className={`relative z-10 flex-shrink-0 w-14 h-14 ${colorClasses[color]} rounded-full flex items-center justify-center text-white text-2xl shadow-lg`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <p className="text-xs text-gray-500">
          {format(date, 'MMMM d, yyyy h:mm a')}
        </p>
      </div>
    </div>
  );
}

/**
 * Timeline Date Marker
 * Marker to separate timeline by date
 */
export function TimelineDateMarker({ date }: { date: string }) {
  return (
    <div className="relative flex items-center gap-4 py-4">
      <div className="flex-shrink-0 w-10 h-10"></div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-gray-300" />
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {date}
          </span>
          <hr className="flex-1 border-gray-300" />
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal Timeline
 * Alternative horizontal layout
 */
export function HorizontalTimeline({
  activities,
  className = '',
}: {
  activities: Activity[];
  className?: string;
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="flex items-start gap-8 min-w-max p-4">
        {activities.map((activity, index) => {
          const time = activity.timestamp
            ? format(activity.timestamp.toDate(), 'MMM d, h:mm a')
            : '';

          return (
            <div key={activity.id} className="relative flex flex-col items-center">
              {/* Connecting Line */}
              {index < activities.length - 1 && (
                <div className="absolute top-5 left-1/2 w-full h-0.5 bg-gray-200"></div>
              )}

              {/* Icon */}
              <div className="relative z-10 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl shadow-md mb-3">
                {activity.icon || getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="text-center max-w-[200px]">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {activity.title}
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500">{time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
