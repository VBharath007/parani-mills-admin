const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

const ACCOUNTS = [
  {
    username: 'pmsadmin',
    password: 'SirMam@2026',
    role: 'admin',
    description: 'Client Primary Admin Account',
  },
  {
    username: 'hexavisiontechnologies',
    password: 'BharathSuriya@2026',
    role: 'superadmin',
    description: 'Developer Emergency Backup Account',
  },
];

const setupStrongAdmins = async () => {
  try {
    console.log('🔄 Connecting to Firebase Firestore to setup 2 admin accounts...');
    const adminsRef = db.collection('admins');
    const timestamp = new Date().toISOString();

    for (const acc of ACCOUNTS) {
      const username = acc.username.toLowerCase().trim();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(acc.password, salt);

      const snapshot = await adminsRef.where('username', '==', username).get();

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await adminsRef.doc(docId).update({
          password: hashedPassword,
          role: acc.role,
          updatedAt: timestamp,
        });
        console.log(`✅ Updated existing account: [${username}]`);
      } else {
        const docRef = await adminsRef.add({
          username,
          password: hashedPassword,
          role: acc.role,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        console.log(`✨ Created new account: [${username}] (ID: ${docRef.id})`);
      }
    }

    console.log('\n=============================================');
    console.log('🎉 2 Admin Accounts Setup Successfully in Firestore!');
    console.log('---------------------------------------------');
    ACCOUNTS.forEach(a => {
      console.log(`👤 Username: ${a.username}`);
      console.log(`🔑 Password: ${a.password}`);
      console.log(`📋 Type:     ${a.description}`);
      console.log('---------------------------------------------');
    });
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin accounts:', error.message);
    process.exit(1);
  }
};

setupStrongAdmins();

