const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for authenticated admin
 * @param {Object} payload - { id, username, role }
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      role: payload.role || 'admin',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    }
  );
};

module.exports = generateToken;
