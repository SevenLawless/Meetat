import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef({});
  const lastEventIdRef = useRef(null);

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = api.getToken();
    if (!token) return;

    // Use runtime config first, then build-time config, then fallback
    // Priority: 1) window.__APP_CONFIG__.WS_URL, 2) VITE_WS_URL, 3) Relative path
    let wsUrl;
    const runtimeConfig = typeof window !== 'undefined' && window.__APP_CONFIG__;
    const runtimeWsUrl = runtimeConfig?.WS_URL;
    
    if (runtimeWsUrl) {
      // Runtime config from config.js
      wsUrl = `${runtimeWsUrl}/ws?token=${token}`;
    } else if (import.meta.env.VITE_WS_URL) {
      // Build-time config
      wsUrl = `${import.meta.env.VITE_WS_URL}/ws?token=${token}`;
    } else {
      // Fallback to relative path (same host)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('WebSocket connected');
      }
      setConnected(true);

      // Sync missed events if we have a last event ID
      if (lastEventIdRef.current) {
        ws.send(JSON.stringify({
          type: 'sync',
          lastEventId: lastEventIdRef.current
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = (event) => {
      // Only log in development, and suppress normal closures
      if (process.env.NODE_ENV === 'development' && event.code !== 1000) {
        console.log('WebSocket disconnected');
      }
      setConnected(false);
      wsRef.current = null;

      // Reconnect after delay
      if (user) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      // Only log errors in development, and suppress connection refused errors
      if (process.env.NODE_ENV === 'development') {
        // Connection refused errors are expected when backend is down - don't spam console
        const errorMessage = error.message || error.toString() || '';
        if (!errorMessage.includes('CONNECTION_REFUSED') && !errorMessage.includes('Failed to construct')) {
          console.error('WebSocket error:', error);
        }
      }
    };
  }, [user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user) {
      connect();
      loadNotifications();
    } else {
      disconnect();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => disconnect();
  }, [user, connect, disconnect]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      
      if (data.notifications.length > 0) {
        lastEventIdRef.current = data.notifications[0].id;
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleMessage = (message) => {
    switch (message.type) {
      case 'notification':
        setNotifications(prev => [message.data, ...prev]);
        setUnreadCount(prev => prev + 1);
        lastEventIdRef.current = message.data.id;
        
        // Trigger listeners
        Object.values(listenersRef.current).forEach(listener => {
          listener('notification', message.data);
        });
        break;

      case 'task_created':
      case 'task_updated':
      case 'task_deleted':
      case 'comment_added':
        Object.values(listenersRef.current).forEach(listener => {
          listener(message.type, message);
        });
        break;

      case 'sync':
        if (message.notifications) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNotifications = message.notifications.filter(n => !existingIds.has(n.id));
            return [...newNotifications, ...prev];
          });
          setUnreadCount(prev => prev + message.notifications.filter(n => !n.read).length);
          
          if (message.notifications.length > 0) {
            lastEventIdRef.current = message.notifications[message.notifications.length - 1].id;
          }
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'connected':
        // Connection confirmed by server
        break;

      case 'subscribed':
      case 'unsubscribed':
        // Project subscription confirmations
        break;

      case 'task_update':
        // Handle task_update from broadcast - forward to listeners
        Object.values(listenersRef.current).forEach(listener => {
          listener(`task_${message.action}`, message.task);
        });
        break;

      case 'error':
        console.error('WebSocket server error:', message.message);
        break;

      default:
        // Silently ignore unknown message types in production
        if (process.env.NODE_ENV === 'development') {
          console.log('Unhandled WebSocket message type:', message.type);
        }
    }
  };

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribeToProject = useCallback((projectId) => {
    send({ type: 'subscribe_project', projectId });
  }, [send]);

  const unsubscribeFromProject = useCallback((projectId) => {
    send({ type: 'unsubscribe_project', projectId });
  }, [send]);

  const addListener = useCallback((id, callback) => {
    listenersRef.current[id] = callback;
  }, []);

  const removeListener = useCallback((id) => {
    delete listenersRef.current[id];
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const dismissNotifications = async (ids) => {
    try {
      await api.dismissNotifications(ids);
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setUnreadCount(prev => {
        const dismissedUnread = notifications.filter(n => ids.includes(n.id) && !n.read).length;
        return Math.max(0, prev - dismissedUnread);
      });
    } catch (error) {
      console.error('Failed to dismiss notifications:', error);
    }
  };

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  return (
    <WebSocketContext.Provider value={{
      connected,
      notifications,
      unreadCount,
      send,
      subscribeToProject,
      unsubscribeFromProject,
      addListener,
      removeListener,
      markAsRead,
      markAllAsRead,
      dismissNotifications,
      removeNotification,
      refreshNotifications: loadNotifications
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

