const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function deleteAllProducts() {
  console.log('Starting to delete all products...');
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log('No products found to delete. Database is already empty.');
    return;
  }

  let count = 0;
  // Firestore batch limit is 500, assuming there are less than 500 default products.
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();
  console.log(`Successfully deleted ${count} products from Firebase.`);
}

deleteAllProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error deleting products:', err);
    process.exit(1);
  });
