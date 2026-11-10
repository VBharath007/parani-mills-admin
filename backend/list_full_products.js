const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function listProductData() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  snapshot.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

listProductData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
