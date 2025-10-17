/**
 * Notifications Screen
 *
 * Full-page notification center with filtering and preferences
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useNotificationPreferences,
} from '../hooks/useNotifications';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../lib/notifications/notification-service';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Notification Type Filter Badge
 */
function TypeBadge({ type }: { type: NotificationType }) {
  const labels: Record<NotificationType, string> = {
    [NotificationType.JOB_ASSIGNED]: 'Job Assigned',
    [NotificationType.JOB_STATUS_CHANGED]: 'Job Status',
    [NotificationType.JOB_COMPLETED]: 'Job Complete',
    [NotificationType.JOB_CANCELLED]: 'Job Cancelled',
    [NotificationType.JOB_COMMENT]: 'Comment',
    [NotificationType.INVOICE_CREATED]: 'Invoice',
    [NotificationType.INVOICE_PAID]: 'Payment',
    [NotificationType.INVOICE_OVERDUE]: 'Overdue',
    [NotificationType.INVOICE_SENT]: 'Invoice Sent',
    [NotificationType.PAYMENT_RECEIVED]: 'Payment',
    [NotificationType.TIME_ENTRY_APPROVED]: 'Approved',
    [NotificationType.TIME_ENTRY_REJECTED]: 'Rejected',
    [NotificationType.TIME_ENTRY_REMINDER]: 'Reminder',
    [NotificationType.USER_INVITED]: 'Invite',
    [NotificationType.USER_ROLE_CHANGED]: 'Role Change',
    [NotificationType.USER_MENTIONED]: 'Mention',
    [NotificationType.SYSTEM_UPDATE]: 'Update',
    [NotificationType.SYSTEM_MAINTENANCE]: 'Maintenance',
    [NotificationType.SYSTEM_ALERT]: 'Alert',
    [NotificationType.MESSAGE]: 'Message',
    [NotificationType.REMINDER]: 'Reminder',
    [NotificationType.ANNOUNCEMENT]: 'Announcement',
  };

  return (
    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
      {labels[type]}
    </span>
  );
}

/**
 * Priority Badge
 */
function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const colors = {
    [NotificationPriority.LOW]: 'bg-gray-100 text-gray-700',
    [NotificationPriority.NORMAL]: 'bg-blue-100 text-blue-800',
    [NotificationPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [NotificationPriority.URGENT]: 'bg-red-100 text-red-800',
  };

  if (priority === NotificationPriority.NORMAL) {
    return null; // Don't show normal priority
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
}

/**
 * Notification Card Component
 */
function NotificationCard({ notification }: { notification: Notification }) {
  const navigate = useNavigate();
  const { markAsRead, archive, delete: deleteNotif } = useNotifications();
  const [showActions, setShowActions] = useState(false);

  const handleClick = async () => {
    if (!notification.read && notification.id) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.id) {
      await archive(notification.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.id) {
      await deleteNotif(notification.id);
    }
  };

  const timeAgo = notification.createdAt
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
    : '';

  const fullDate = notification.createdAt
    ? format(notification.createdAt.toDate(), 'PPpp')
    : '';

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
      }`}
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-3xl">
          {notification.icon || '🔔'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={notification.priority} />
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span title={fullDate}>{timeAgo}</span>
            <TypeBadge type={notification.type} />
          </div>

          {/* Actions (shown on hover) */}
          {showActions && (
            <div className="mt-3 flex items-center gap-2">
              {notification.link && (
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View Details →
                </button>
              )}
              <button
                onClick={handleArchive}
                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
              >
                Archive
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Preferences Panel
 */
function PreferencesPanel() {
  const { preferences, loading, updatePreferences, toggleNotificationType, isTypeEnabled } =
    useNotificationPreferences();

  if (loading) {
    return <div className="p-4">Loading preferences...</div>;
  }

  if (!preferences) {
    return <div className="p-4">Could not load preferences</div>;
  }

  return (
    <div className="space-y-6">
      {/* Channel Preferences */}
      <div>
        <h3 className="text-lg font-medium mb-3">Notification Channels</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.inApp}
              onChange={(e) => updatePreferences({ inApp: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">In-app notifications</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(e) => updatePreferences({ email: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Email notifications</span>
          </label>

          <label className="flex items-center opacity-50 cursor-not-allowed">
            <input
              type="checkbox"
              checked={preferences.push}
              disabled
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Push notifications (coming soon)
            </span>
          </label>
        </div>
      </div>

      {/* Type Preferences */}
      <div>
        <h3 className="text-lg font-medium mb-3">Notification Types</h3>
        <div className="space-y-2">
          {Object.values(NotificationType).map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={isTypeEnabled(type)}
                onChange={() => toggleNotificationType(type)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                <TypeBadge type={type} />
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-medium mb-3">Quiet Hours</h3>
        <label className="flex items-center mb-3">
          <input
            type="checkbox"
            checked={preferences.quietHoursEnabled}
            onChange={(e) =>
              updatePreferences({ quietHoursEnabled: e.target.checked })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Enable quiet hours</span>
        </label>

        {preferences.quietHoursEnabled && (
          <div className="flex gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start</label>
              <input
                type="time"
                value={preferences.quietHoursStart || '22:00'}
                onChange={(e) =>
                  updatePreferences({ quietHoursStart: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End</label>
              <input
                type="time"
                value={preferences.quietHoursEnd || '08:00'}
                onChange={(e) =>
                  updatePreferences({ quietHoursEnd: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Notifications Screen
 */
export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'preferences'>('all');
  const [filterType, setFilterType] = useState<NotificationType | undefined>();

  const { notifications, unreadCount, loading, markAllAsRead, groupedNotifications } =
    useNotifications({
      unreadOnly: activeTab === 'unread',
      type: filterType,
      limitCount: 100,
    });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && activeTab !== 'preferences' && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'unread'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preferences'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preferences
            </button>
          </nav>
        </div>
      </div>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white shadow rounded-lg p-6">
          <PreferencesPanel />
        </div>
      )}

      {/* Notifications List */}
      {activeTab !== 'preferences' && (
        <>
          {/* Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by type
            </label>
            <select
              value={filterType || ''}
              onChange={(e) =>
                setFilterType(e.target.value ? (e.target.value as NotificationType) : undefined)
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All types</option>
              {Object.values(NotificationType).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading notifications...</div>
            </div>
          )}

          {/* Empty State */}
          {!loading && notifications.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                {activeTab === 'unread'
                  ? "You're all caught up!"
                  : 'When you receive notifications, they will appear here'}
              </p>
            </div>
          )}

          {/* Grouped Notifications */}
          {!loading && notifications.length > 0 && (
            <div className="space-y-8">
              {groupedNotifications.today.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Today
                  </h2>
                  <div className="space-y-3">
                    {groupedNotifications.today.map((notification) => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              )}

              {groupedNotifications.yesterday.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Yesterday
                  </h2>
                  <div className="space-y-3">
                    {groupedNotifications.yesterday.map((notification) => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              )}

              {groupedNotifications.thisWeek.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    This Week
                  </h2>
                  <div className="space-y-3">
                    {groupedNotifications.thisWeek.map((notification) => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              )}

              {groupedNotifications.older.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Older
                  </h2>
                  <div className="space-y-3">
                    {groupedNotifications.older.map((notification) => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
