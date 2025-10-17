/**
 * Notification Bell Component
 *
 * Header component that shows notification bell icon with unread count
 * and dropdown list of recent notifications
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../lib/notifications/notification-service';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notification Icon Component
 */
function NotificationIcon({ type }: { type: NotificationType }) {
  const icons: Record<NotificationType, string> = {
    [NotificationType.JOB_ASSIGNED]: '📋',
    [NotificationType.JOB_STATUS_CHANGED]: '🔄',
    [NotificationType.JOB_COMPLETED]: '✅',
    [NotificationType.JOB_CANCELLED]: '❌',
    [NotificationType.JOB_COMMENT]: '💬',
    [NotificationType.INVOICE_CREATED]: '📄',
    [NotificationType.INVOICE_PAID]: '💰',
    [NotificationType.INVOICE_OVERDUE]: '⚠️',
    [NotificationType.INVOICE_SENT]: '📧',
    [NotificationType.PAYMENT_RECEIVED]: '💵',
    [NotificationType.TIME_ENTRY_APPROVED]: '✓',
    [NotificationType.TIME_ENTRY_REJECTED]: '✗',
    [NotificationType.TIME_ENTRY_REMINDER]: '⏰',
    [NotificationType.USER_INVITED]: '👤',
    [NotificationType.USER_ROLE_CHANGED]: '🔑',
    [NotificationType.USER_MENTIONED]: '@',
    [NotificationType.SYSTEM_UPDATE]: '🔔',
    [NotificationType.SYSTEM_MAINTENANCE]: '🔧',
    [NotificationType.SYSTEM_ALERT]: '🚨',
    [NotificationType.MESSAGE]: '✉️',
    [NotificationType.REMINDER]: '⏰',
    [NotificationType.ANNOUNCEMENT]: '📢',
  };

  return <span className="text-2xl">{icons[type] || '🔔'}</span>;
}

/**
 * Notification Item Component
 */
function NotificationItem({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const handleClick = async () => {
    // Mark as read
    if (!notification.read && notification.id) {
      await markAsRead(notification.id);
    }

    // Navigate to link if present
    if (notification.link) {
      navigate(notification.link);
    }

    onClose();
  };

  const timeAgo = notification.createdAt
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
    : '';

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          <NotificationIcon type={notification.type} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Notification Bell Component
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    isEmpty,
  } = useNotifications({ limitCount: 10 });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleViewAll = () => {
    navigate('/notifications');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        {/* Bell SVG */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center text-gray-500">
                Loading notifications...
              </div>
            )}

            {!loading && isEmpty && (
              <div className="px-4 py-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500">No notifications</p>
              </div>
            )}

            {!loading && !isEmpty && (
              <>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {!isEmpty && (
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={handleViewAll}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Notification Bell Compact (for mobile)
 */
export function NotificationBellCompact() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications({ limitCount: 1 });

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative p-2 text-gray-600 hover:text-gray-900"
      aria-label="Notifications"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
