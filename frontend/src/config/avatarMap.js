// Avatar mapping: Maps user IDs or emails to avatar filenames
// Place avatar images in /public/avatars/ folder
// Images should be named: avatar-1.png, avatar-2.png, etc.

// You can map by user ID (recommended) or by email
// Format: userId or email: 'avatar-filename.png'

const avatarMap = {
  // Example mappings (update with actual user IDs/emails):
  'khuna@gmail.com': 'khuna.jpg',
  'khtna@gmail.com': 'khtna.jpg',

};

// Get avatar for a user
export const getUserAvatar = (user) => {
  if (!user) return null;
  
  // Try user ID first
  if (user.id && avatarMap[user.id]) {
    return `/avatars/${avatarMap[user.id]}`;
  }
  
  // Fallback to email
  if (user.email && avatarMap[user.email]) {
    return `/avatars/${avatarMap[user.email]}`;
  }
  
  return null;
};

// Get all available avatars (for selection UI if needed)
export const getAvailableAvatars = () => {
  // This would typically read from the avatars folder
  // For now, return a simple array - you can expand this
  return [
    'avatar-1.png',
    'avatar-2.png',
    'avatar-3.png',
    'avatar-4.png',
    'avatar-5.png',
    'avatar-6.png',
    'avatar-7.png',
    'avatar-8.png',
  ];
};

export default avatarMap;

