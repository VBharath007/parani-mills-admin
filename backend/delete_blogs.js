const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function deleteAllBlogs() {
  console.log('Starting to delete all blogs...');
  const blogsRef = db.collection('blogs'); // Assuming the collection is named 'blogs'
  const snapshot = await blogsRef.get();
  
  if (snapshot.empty) {
    console.log('No blogs found to delete. Database is already empty.');
    return;
  }

  let count = 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();
  console.log(`Successfully deleted ${count} blogs from Firebase.`);
}

deleteAllBlogs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error deleting blogs:', err);
    process.exit(1);
  });
