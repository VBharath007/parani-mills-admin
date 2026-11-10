const bcrypt = require('bcryptjs');
const { db } = require('../../config/firebase');
const generateToken = require('../../utils/generateToken');

/**
 * Admin Login Service using Firebase Firestore
 * @param {Object} credentials - { username, password }
 * @returns {Object} { admin, token }
 */
const login = async ({ username, password }) => {
  const normalizedUsername = (username || '').toLowerCase().trim();

  // 1. Query admin by username from Firestore 'admins' collection
  const adminsRef = db.collection('admins');
  const snapshot = await adminsRef.where('username', '==', normalizedUsername).limit(1).get();

  if (snapshot.empty) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  const adminDoc = snapshot.docs[0];
  const adminData = adminDoc.data();

  // 2. Compare password using bcrypt
  const isMatch = await bcrypt.compare(password, adminData.password);

  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  // 3. Generate JWT Token
  const token = generateToken({
    id: adminDoc.id,
    username: adminData.username,
    role: adminData.role || 'admin',
  });

  // 4. Return admin information (excluding hashed password) + token
  return {
    admin: {
      _id: adminDoc.id,
      id: adminDoc.id,
      username: adminData.username,
      role: adminData.role || 'admin',
    },
    token,
  };
};

module.exports = {
  login,
};
