const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function listProducts() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log('0 products found in the database.');
    return;
  }

  console.log(`Found ${snapshot.size} products:`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  Name: ${data.name}`);
    console.log(`  Category: "${data.category}"`);
  });
}

listProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
