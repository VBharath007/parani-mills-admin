const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./src/app');
const { db } = require('./src/config/firebase');

const PORT = process.env.PORT || 5001;

// Start HTTP server with Firebase Firestore initialized
const startServer = async () => {
  try {
    // 1. Verify Firestore connectivity
    if (!db) {
      throw new Error('Firestore database instance not initialized');
    }

    // 2. Start Express listener
    app.listen(PORT, () => {
      console.log('=============================================');
      console.log(`🚀 Parani Mill Stores API running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔥 Database: Firebase Cloud Firestore (${process.env.FIREBASE_PROJECT_ID || 'parani-mill-store'})`);
      console.log('=============================================');
    });
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
