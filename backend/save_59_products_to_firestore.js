const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function saveToFirestore() {
  console.log('========================================================');
  console.log('🚀 SAVING EXACT 59 PRODUCTS & 8 CATEGORIES TO FIRESTORE');
  console.log('========================================================');

  // Load 59 products from cache
  const products = require('./src/cache/products.json');
  console.log(`📦 Loaded ${products.length} products to save...`);

  // Load 8 categories from cache
  const categories = require('./src/cache/categories.json');
  console.log(`🏷️ Loaded ${categories.length} categories to save...`);

  // Batch write Categories
  console.log('\nWriting 8 categories to Firestore...');
  const catBatch = db.batch();
  categories.forEach(cat => {
    const docId = cat.id || ('cat_' + cat.slug);
    const docRef = db.collection('categories').doc(docId);
    catBatch.set(docRef, {
      name: cat.name,
      slug: cat.slug,
      createdAt: cat.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
  await catBatch.commit();
  console.log('✅ All 8 categories written successfully!');

  // Batch write Products (max 500 per batch in Firestore, we have 59 so 1 batch is enough)
  console.log('\nWriting 59 products to Firestore...');
  const prodBatch = db.batch();
  const summary = {};

  products.forEach(p => {
    const docId = p.id || p._id || db.collection('products').doc().id;
    const docRef = db.collection('products').doc(docId);

    summary[p.category] = (summary[p.category] || 0) + 1;

    const payload = {
      name: p.name,
      slug: p.slug,
      category: p.category,
      folder: p.folder || '',
      thumbnail: p.thumbnail || '',
      images: Array.isArray(p.images) ? p.images : [],
      stroke: p.stroke || '',
      specs: p.specs || {},
      price: Number(p.price) || 0,
      stock: p.stock !== undefined ? Number(p.stock) : 15,
      isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
      isProductOfTheMonth: Boolean(p.isProductOfTheMonth),
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    prodBatch.set(docRef, payload, { merge: true });
  });

  await prodBatch.commit();
  console.log(`✅ Successfully saved all ${products.length} products into Firestore!\n`);

  console.log('📊 Category Breakdown in DB:');
  Object.entries(summary).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   - ${cat.padEnd(30)}: ${count} products`);
  });

  console.log('\n========================================================');
  console.log('🎉 DB SYNC COMPLETED SUCCESSFULLY!');
  console.log('========================================================');
}

saveToFirestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to save to Firestore:', err);
    process.exit(1);
  });
