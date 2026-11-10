const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

const seedAdmin = async () => {
  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    console.log('Checking Firebase Firestore for admin account...');
    const adminsRef = db.collection('admins');
    const snapshot = await adminsRef.where('username', '==', username).get();

    if (!snapshot.empty) {
      console.log(`Admin account '${username}' already exists in Firestore. No action needed.`);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const timestamp = new Date().toISOString();

    // Create admin document
    const newAdmin = {
      username,
      password: hashedPassword,
      role: 'admin',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docRef = await adminsRef.add(newAdmin);

    console.log('=============================================');
    console.log('🔥 Admin account seeded successfully into Firestore!');
    console.log(`Document ID: ${docRef.id}`);
    console.log(`Username: ${username}`);
    console.log('Password has been securely hashed with bcrypt.');
    console.log('=============================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin into Firestore:', error.message);
    process.exit(1);
  }
};

seedAdmin();
