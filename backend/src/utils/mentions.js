const db = require('../config/database');

// Extract @mentions from text
const extractMentions = (text) => {
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
};

// Get user IDs from usernames
const getUserIdsFromMentions = async (usernames) => {
  if (usernames.length === 0) return [];
  
  const placeholders = usernames.map(() => '?').join(',');
  const [users] = await db.query(
    `SELECT id, name FROM users WHERE name IN (${placeholders})`,
    usernames
  );
  
  return users.map(u => u.id);
};

// Parse text and get mentioned user IDs
const parseMentions = async (text) => {
  const usernames = extractMentions(text);
  return getUserIdsFromMentions(usernames);
};

module.exports = {
  extractMentions,
  getUserIdsFromMentions,
  parseMentions
};

