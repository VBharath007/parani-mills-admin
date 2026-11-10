const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

const generateSlug = (text) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const determineCategory = (product) => {
  const name = (product.name || '').toUpperCase();
  const folder = (product.folder || '').toUpperCase();
  const cat = (product.category || '').toUpperCase();
  const specs = JSON.stringify(product.specs || {}).toUpperCase();

  // Check specific categories first
  if (name.includes('BRUSH CUTTER') || folder.includes('BRUSH CUTTER') || cat.includes('BRUSH CUTTER')) {
    return 'Brush Cutter';
  }
  if (name.includes('CHAFF') || name.includes('CHAF') || name.includes('CHIPPER') || folder.includes('CHAFF') || folder.includes('CHIPPER')) {
    return 'Chaff Cutter & Wood Chipper';
  }
  if (folder.includes('CONSTRUCTION') || name.includes('VIBRATOR') || name.includes('COMPRESSOR') || name.includes('WASHER') || name.includes('VACCUM') || name.includes('RICE MILL') || cat.includes('CONSTRUCTION')) {
    return 'Construction Equipment';
  }
  if (name.includes('AUGER') || name.includes('AUGUR') || folder.includes('AUGER') || folder.includes('AUGUR')) {
    return 'Earth Augur';
  }
  if (name.includes('RAMMER') || folder.includes('RAMMER') || cat.includes('RAMMER')) {
    return 'Earth Rammer';
  }
  if (folder.includes('SPRAYER') || name.includes('SPRAYER') || name.includes('HTP')) {
    return 'Sprayer';
  }
  if (folder.includes('WATER PUMP') || name.includes('WATER PUMP') || (name.includes('PUMP') && !name.includes('HTP'))) {
    return 'Water Pump';
  }
  if (folder.includes('WEEDER') || name.includes('WEEDER') || name.includes('TILLER')) {
    return 'Weeder';
  }
  if (name.includes('HONDA') || specs.includes('HONDA')) {
    return 'Honda Products';
  }
  if (name.includes('HEDGE') || name.includes('HARVESTER') || name.includes('STUBBLE') || name.includes('CHAINSAW') || cat.includes('HEDGE')) {
    return 'Hedge Trimmer';
  }
  if (folder.includes('GENSET') || name.includes('GENERATOR') || cat.includes('GENSET')) {
    return 'Gensets';
  }
  if (folder.includes('ENGINE') || name.includes('ENGINE')) {
    return 'Engines';
  }

  return 'Agricultural Machinery';
};

async function syncFreshProducts() {
  console.log('========================================================');
  console.log('🔄 STARTING SYNC: RESET & SEED 12 CATEGORIES INTO FIREBASE');
  console.log('========================================================');

  // Paths to JSON files in Paranimill
  const productsJsonPath = 'd:/Paranimill/src/products.json';
  const gensetsJsonPath = 'd:/Paranimill/src/gensets.json';
  const constructionJsonPath = 'd:/Paranimill/src/construction.json';

  const productsData = fs.existsSync(productsJsonPath) ? JSON.parse(fs.readFileSync(productsJsonPath, 'utf8')) : [];
  const gensetsData = fs.existsSync(gensetsJsonPath) ? JSON.parse(fs.readFileSync(gensetsJsonPath, 'utf8')) : [];
  const constructionData = fs.existsSync(constructionJsonPath) ? JSON.parse(fs.readFileSync(constructionJsonPath, 'utf8')) : [];

  console.log(`📦 Loaded from UI: ${productsData.length} products, ${gensetsData.length} gensets, ${constructionData.length} construction items`);

  // Merge & deduplicate by name
  const combined = [...productsData, ...gensetsData, ...constructionData];
  const uniqueMap = new Map();
  combined.forEach(p => {
    if (p.name && !uniqueMap.has(p.name.trim().toLowerCase())) {
      uniqueMap.set(p.name.trim().toLowerCase(), p);
    }
  });

  const uniqueProducts = Array.from(uniqueMap.values());
  console.log(`✨ Total unique items to sync: ${uniqueProducts.length}\n`);

  // Step 1: Wipe existing products from Firestore
  console.log('🗑️ Step 1: Deleting existing products in Firestore...');
  const productsRef = db.collection('products');
  const existingSnapshot = await productsRef.get();

  if (!existingSnapshot.empty) {
    const deleteBatch = db.batch();
    existingSnapshot.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log(`✅ Deleted ${existingSnapshot.size} old products from Firebase Firestore (Database is now 0).`);
  } else {
    console.log('ℹ️ Database already had 0 products.');
  }

  // Step 2: Upload fresh products with 12 Categories
  console.log('\n🚀 Step 2: Uploading fresh products with 12 categories...');
  const insertBatch = db.batch();
  const timestamp = new Date().toISOString();
  const categorySummary = {};

  uniqueProducts.forEach(p => {
    const docRef = productsRef.doc();
    const assignedCategory = determineCategory(p);

    categorySummary[assignedCategory] = (categorySummary[assignedCategory] || 0) + 1;

    const thumbnail = p.thumbnail || (Array.isArray(p.images) && p.images[0] ? p.images[0] : '');
    const images = Array.isArray(p.images) ? p.images : (thumbnail ? [thumbnail] : []);

    const productPayload = {
      name: p.name.trim(),
      slug: generateSlug(p.name),
      category: assignedCategory,
      folder: p.folder || '',
      thumbnail: thumbnail,
      images: images,
      stroke: p.stroke || '',
      specs: p.specs || {},
      price: p.price || 0,
      stock: p.stock !== undefined ? p.stock : 15,
      isActive: true,
      isProductOfTheMonth: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    insertBatch.set(docRef, productPayload);
  });

  await insertBatch.commit();
  console.log(`\n🎉 Successfully uploaded ${uniqueProducts.length} fresh products to Firebase Firestore!\n`);

  console.log('📊 Category Breakdown in Firebase:');
  Object.entries(categorySummary).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   - ${cat.padEnd(30)}: ${count} products`);
  });

  console.log('\n========================================================');
  console.log('✅ SYNC COMPLETED SUCCESSFULLY!');
  console.log('========================================================');
}

syncFreshProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
