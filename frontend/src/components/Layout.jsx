import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import NotificationsDropdown from './NotificationsDropdown';
import PersonalTodoSidebar from './PersonalTodoSidebar';
import Avatar from './Avatar';
import {
  LayoutDashboard,
  FolderKanban,
  Bell,
  X,
  LogOut,
  User,
  CheckSquare,
  Shield,
  ChevronDown,
  Megaphone
} from 'lucide-react';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCount } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTodos, setShowTodos] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Click outside handler for notifications and user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        // Check if click is not on the notification button
        const button = event.target.closest('button[title="Notifications"]');
        if (!button) {
          setShowNotifications(false);
        }
      }
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        const button = event.target.closest('button');
        if (!button || !button.contains(userMenuRef.current)) {
          setShowUserMenu(false);
        }
      }
    };

    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications, showUserMenu]);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin Panel' });
    navItems.push({ path: '/marketing', icon: Megaphone, label: 'Marketing Management' });
  }

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar - Always visible at fixed width */}
      <aside className="w-64 bg-white border-r border-surface-200 flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 px-6 flex items-center border-b border-surface-200">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-800 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-surface-900">Meetat</span>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-50 text-primary-800 font-medium'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-surface-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar user={user} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900 truncate text-sm">{user?.name}</p>
                <p className="text-xs text-surface-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Personal Todos */}
            <button
              className="icon-btn relative"
              onClick={() => setShowTodos(!showTodos)}
              title="My To-Do List"
            >
              <CheckSquare className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                className="icon-btn relative"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                }}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <NotificationsDropdown onClose={() => setShowNotifications(false)} />
              )}
            </div>

            {/* User menu */}
            <div className="relative ml-2" ref={userMenuRef}>
              <button
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-surface-50 transition-colors"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar user={user} size="sm" />
                <ChevronDown className="w-4 h-4 text-surface-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 dropdown animate-scale-in z-50">
                  <div className="px-4 py-3 border-b border-surface-100">
                    <p className="font-medium text-surface-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-surface-500 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="dropdown-item w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Personal Todo Sidebar */}
      {showTodos && (
        <PersonalTodoSidebar onClose={() => setShowTodos(false)} />
      )}

    </div>
  );
};

export default Layout;
