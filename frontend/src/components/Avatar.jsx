import React, { useState } from 'react';
import { getUserAvatar } from '../config/avatarMap';

const Avatar = ({ user, size = 'md', className = '', showName = false }) => {
  const [imageError, setImageError] = useState(false);
  const avatarSrc = getUserAvatar(user);
  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const baseClasses = `rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-semibold border-2 border-white shadow-sm ${sizeClasses[size]} ${className}`;

  if (avatarSrc && !imageError) {
    return (
      <div className="relative inline-block">
        <img
          src={avatarSrc}
          alt={user?.name || 'Avatar'}
          className={`${baseClasses} object-cover`}
          onError={() => setImageError(true)}
        />
        {showName && user?.name && (
          <span className="ml-2 text-sm font-medium text-surface-700">{user.name}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <div className={baseClasses}>
        {initials}
      </div>
      {showName && user?.name && (
        <span className="ml-2 text-sm font-medium text-surface-700">{user.name}</span>
      )}
    </div>
  );
};

export default Avatar;

