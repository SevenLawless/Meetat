/**
 * Centralized Color Configuration
 * 
 * This file contains all color classes used throughout the application.
 * Modify colors here to change the color scheme across the entire app.
 */

// Notification icon colors
export const notificationIconColors = {
  mention: 'text-primary-600',
  assignment: 'text-emerald-600',
  unassignment: 'text-amber-600',
  status_change: 'text-blue-600',
  comment_added: 'text-purple-600',
  task_deleted: 'text-red-600',
  project_invitation: 'text-primary-600',
  role_change: 'text-amber-600',
  default: 'text-surface-400'
};

// Notification UI colors
export const notificationColors = {
  unreadIndicator: 'bg-primary-500',
  unreadBackground: 'bg-primary-50/30',
  readBackground: 'bg-white',
  selectedBackground: 'bg-primary-50/50',
  selectedRing: 'ring-2 ring-primary-500',
  textRead: 'text-surface-600',
  textUnread: 'text-surface-900 font-medium',
  timeText: 'text-surface-400',
  filterActive: 'bg-primary-100 text-primary-700',
  filterInactive: 'text-surface-600 hover:bg-surface-100',
  headerText: 'text-surface-900',
  emptyStateIcon: 'text-surface-400',
  emptyStateText: 'text-surface-500',
  deleteButton: 'text-red-600 hover:text-red-700',
  deleteButtonHover: 'hover:bg-red-50 hover:text-red-600',
  markReadButton: 'text-primary-600',
  markReadButtonHover: 'hover:bg-primary-100 hover:text-primary-700',
  checkbox: 'border-surface-300 text-primary-600 focus:ring-primary-500'
};

// Toast colors
export const toastColors = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-primary-50 text-primary-700 border-primary-200'
};

// Task status colors
export const statusColors = {
  todo: 'bg-surface-100 text-surface-700 border-surface-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

// Priority colors
export const priorityColors = {
  low: {
    text: 'text-surface-500',
    dot: 'bg-surface-400'
  },
  medium: {
    text: 'text-amber-600',
    dot: 'bg-amber-500'
  },
  high: {
    text: 'text-red-600',
    dot: 'bg-red-500'
  }
};

// General UI colors
export const uiColors = {
  primary: {
    50: 'bg-primary-50',
    100: 'bg-primary-100',
    500: 'bg-primary-500',
    600: 'text-primary-600',
    700: 'text-primary-700',
    800: 'text-primary-800'
  },
  surface: {
    50: 'bg-surface-50',
    100: 'bg-surface-100',
    200: 'bg-surface-200',
    300: 'bg-surface-300',
    400: 'text-surface-400',
    500: 'text-surface-500',
    600: 'text-surface-600',
    700: 'text-surface-700',
    900: 'text-surface-900'
  },
  emerald: {
    50: 'bg-emerald-50',
    600: 'text-emerald-600',
    700: 'text-emerald-700'
  },
  amber: {
    50: 'bg-amber-50',
    500: 'text-amber-500',
    600: 'text-amber-600',
    700: 'text-amber-700'
  },
  red: {
    50: 'bg-red-50',
    500: 'text-red-500',
    600: 'text-red-600',
    700: 'text-red-700'
  },
  blue: {
    600: 'text-blue-600'
  },
  purple: {
    600: 'text-purple-600'
  }
};

// Helper function to get notification icon color
export const getNotificationIconColor = (type) => {
  return notificationIconColors[type] || notificationIconColors.default;
};

// Helper function to get status color
export const getStatusColor = (status) => {
  return statusColors[status] || statusColors.todo;
};

// Helper function to get priority color
export const getPriorityColor = (priority) => {
  return priorityColors[priority] || priorityColors.medium;
};

// Helper function to get toast color
export const getToastColor = (type) => {
  return toastColors[type] || toastColors.info;
};

