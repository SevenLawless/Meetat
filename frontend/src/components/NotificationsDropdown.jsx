import React, { useState, useMemo } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import {
  Bell,
  AtSign,
  UserPlus,
  UserMinus,
  CheckCircle,
  MessageSquare,
  Trash2,
  FolderPlus,
  Shield,
  CheckCheck,
  X,
  Filter,
  Circle
} from 'lucide-react';

const getNotificationIcon = (type) => {
  const iconClass = "w-4 h-4";
  switch (type) {
    case 'mention':
      return <AtSign className={`${iconClass} text-primary-600`} />;
    case 'assignment':
      return <UserPlus className={`${iconClass} text-emerald-600`} />;
    case 'unassignment':
      return <UserMinus className={`${iconClass} text-amber-600`} />;
    case 'status_change':
      return <CheckCircle className={`${iconClass} text-blue-600`} />;
    case 'comment_added':
      return <MessageSquare className={`${iconClass} text-purple-600`} />;
    case 'task_deleted':
      return <Trash2 className={`${iconClass} text-red-600`} />;
    case 'project_invitation':
      return <FolderPlus className={`${iconClass} text-primary-600`} />;
    case 'role_change':
      return <Shield className={`${iconClass} text-amber-600`} />;
    default:
      return <Bell className={`${iconClass} text-surface-400`} />;
  }
};

const getNotificationText = (notification) => {
  const { type, payload, actor_name } = notification;
  const actor = actor_name || 'Someone';

  switch (type) {
    case 'mention':
      return `${actor} mentioned you in ${payload?.context === 'comment' ? 'a comment' : 'a task'}`;
    case 'assignment':
      return `${actor} assigned you to "${payload?.task_title}"`;
    case 'unassignment':
      return `${actor} removed you from "${payload?.task_title}"`;
    case 'status_change':
      return `"${payload?.task_title}" status changed to ${payload?.new_status}`;
    case 'comment_added':
      return `${actor} commented on "${payload?.task_title}"`;
    case 'task_deleted':
      return `"${payload?.task_title}" was deleted`;
    case 'project_invitation':
      return `${actor} invited you to "${payload?.project_name}"`;
    case 'role_change':
      return `Your role in "${payload?.project_name}" changed to ${payload?.new_role}`;
    default:
      return 'New notification';
  }
};

const formatTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const NotificationsDropdown = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead, removeNotification } = useWebSocket();
  const navigate = useNavigate();
  const { toasts, success, error, removeToast } = useToast();
  const [deletingId, setDeletingId] = useState(null);
  const [markingReadId, setMarkingReadId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.payload?.project_id) {
      navigate(`/project/${notification.payload.project_id}`);
      onClose();
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    if (!confirm('Delete this notification?')) return;

    setDeletingId(notificationId);
    try {
      await api.deleteNotification(notificationId);
      removeNotification(notificationId);
      success('Notification deleted');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      error('Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation();
    setMarkingReadId(notificationId);
    try {
      await markAsRead(notificationId);
      success('Marked as read');
    } catch (err) {
      error('Failed to mark as read');
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAsUnread = async (e, notificationId) => {
    e.stopPropagation();
    // Note: This would require a backend endpoint - for now, we'll just show the UI
    // The backend doesn't have mark-as-unread, so we'll skip the API call
    console.log('Mark as unread not yet implemented in backend');
  };

  const handleToggleSelection = (notificationId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await markAsRead(id);
      }
      success(`Marked ${ids.length} notification(s) as read`);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (err) {
      error('Failed to mark notifications as read');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} notification(s)?`)) return;
    
    const ids = Array.from(selectedIds);
    let successCount = 0;
    try {
      for (const id of ids) {
        try {
          await api.deleteNotification(id);
          removeNotification(id);
          successCount++;
        } catch (err) {
          console.error('Failed to delete notification:', err);
        }
      }
      if (successCount > 0) {
        success(`Deleted ${successCount} notification(s)`);
      }
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (err) {
      error('Failed to delete some notifications');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div 
        className="absolute right-0 mt-2 w-96 dropdown animate-scale-in z-[100] overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-surface-900">Notifications</h3>
          <div className="flex items-center gap-1">
            {bulkMode ? (
              <>
                <button
                  onClick={handleBulkMarkAsRead}
                  disabled={selectedIds.size === 0}
                  className="icon-btn"
                  title="Mark selected as read"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="icon-btn text-red-600 hover:text-red-700"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setBulkMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="icon-btn"
                  title="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setBulkMode(true)}
                  className="icon-btn"
                  title="Select multiple"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="icon-btn"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="icon-btn">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'text-surface-600 hover:bg-surface-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-primary-100 text-primary-700'
                : 'text-surface-600 hover:bg-surface-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-surface-400" />
            </div>
            <p className="text-surface-500 text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const isSelected = selectedIds.has(notification.id);
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-all border-b border-surface-50 ${
                  !notification.read ? 'bg-primary-50/30' : 'bg-white'
                } ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50/50' : ''} ${
                  bulkMode ? 'cursor-default' : 'cursor-pointer'
                }`}
                onClick={() => {
                  if (bulkMode) {
                    handleToggleSelection(notification.id);
                  } else {
                    handleNotificationClick(notification);
                  }
                }}
              >
                {/* Selection checkbox (bulk mode) */}
                {bulkMode && (
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelection(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                )}

                {/* Unread indicator */}
                {!bulkMode && !notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
                )}

                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${notification.read ? 'text-surface-600' : 'text-surface-900 font-medium'}`}>
                    {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    {formatTime(notification.created_at)}
                  </p>
                </div>

                {/* Action buttons - Always visible */}
                {!bulkMode && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {notification.read ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsUnread(e, notification.id);
                        }}
                        className="p-1.5 rounded hover:bg-surface-200 transition-colors opacity-60 hover:opacity-100"
                        title="Mark as unread"
                      >
                        <Circle className="w-3.5 h-3.5 text-surface-500" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        disabled={markingReadId === notification.id}
                        className="p-1.5 rounded hover:bg-primary-100 hover:text-primary-700 transition-colors disabled:opacity-50"
                        title="Mark as read"
                      >
                        {markingReadId === notification.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-surface-300 border-t-primary-600 rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-primary-600" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      disabled={deletingId === notification.id}
                      className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete notification"
                    >
                      {deletingId === notification.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-surface-300 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-surface-500" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
};

export default NotificationsDropdown;
