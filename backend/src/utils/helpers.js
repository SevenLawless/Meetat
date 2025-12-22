// Generate a random ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Format date for MySQL
const formatDateForMySQL = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Paginate results
const paginate = (page = 1, limit = 20) => {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  return {
    limit: Math.min(100, Math.max(1, parseInt(limit))),
    offset
  };
};

// Build pagination response
const paginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  generateId,
  formatDateForMySQL,
  isValidEmail,
  paginate,
  paginationResponse
};

