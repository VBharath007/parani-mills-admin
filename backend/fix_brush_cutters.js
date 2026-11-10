const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function fixBrushCutters() {
  console.log('====================================================');
  console.log('🔧 FIXING BRUSH CUTTER PRODUCT FOLDERS & IMAGES');
  console.log('====================================================');

  const productsPath = path.join(__dirname, 'src/cache/products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  const corrections = {
    'MITSUYAMA 4S 35CC BRUSH CUTTER': 'Parani - 43 Products/BRUSH CUTTER/MITSUYAMA  4S  35CC',
    'REALLY TROLLEY 2S 52CC BRUSH CUTTER': 'Parani - 43 Products/BRUSH CUTTER/REALLY TROLLEY 2S 52CC',
    'MITSUYAMA 2S 52CC BRUSH CUTTER': 'Parani - 43 Products/BRUSH CUTTER/MITSUYAMA  2S  52CC',
    'REALLY 4S 35CC BRUSH CUTTER': 'Parani - 43 Products/BRUSH CUTTER/REALLY  4S  35 CC',
    'REALLY 2S 52CC BRUSH CUTTER': 'Parani - 43 Products/BRUSH CUTTER/REALLY  2S  52CC',
  };

  const batch = db.batch();
  let updatedCount = 0;

  products.forEach(p => {
    if (corrections[p.name]) {
      console.log(`Fixing: ${p.name}`);
      console.log(`   Old folder: ${p.folder}`);
      console.log(`   New folder: ${corrections[p.name]}`);
      
      p.folder = corrections[p.name];
      updatedCount++;

      // Update in Firestore
      const docId = p.id || p._id;
      if (docId) {
        const docRef = db.collection('products').doc(docId);
        batch.set(docRef, { folder: p.folder, updatedAt: new Date().toISOString() }, { merge: true });
      }
    }
  });

  // Write updated cache
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`\n✅ Updated ${updatedCount} products in local cache: ${productsPath}`);

  // Commit to Firestore
  await batch.commit();
  console.log(`🔥 Updated ${updatedCount} Brush Cutter products in Firebase Cloud Firestore!`);

  // Verify all 10 Brush Cutters
  console.log('\n📋 VERIFYING ALL 10 BRUSH CUTTERS:');
  const brushCutters = products.filter(p => p.category === 'Brush Cutter');
  brushCutters.forEach((bc, idx) => {
    const fullDiskPath = path.join('D:/Paranimill/public', bc.folder);
    const existsOnDisk = fs.existsSync(fullDiskPath);
    console.log(`   ${idx + 1}. [${existsOnDisk ? 'EXISTS' : 'MISSING'}] ${bc.name}`);
    console.log(`      Folder: ${bc.folder}`);
    console.log(`      Thumbnail: ${bc.thumbnail}`);
  });

  console.log('\n====================================================');
  console.log('🎉 BRUSH CUTTER REPAIR COMPLETE!');
  console.log('====================================================');
}

fixBrushCutters()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
