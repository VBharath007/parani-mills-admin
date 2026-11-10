const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const cloudinary = require('../config/cloudinary');
const { db } = require('../config/firebase');

// Root path to local frontend product assets
const assetsDir = path.join(__dirname, '../../../frontend/src/assets/products');

// Direct mapping of product names (or keywords) to local asset files
const productAssetMap = {
  'High-Performance Crop Sprayer': 'sprayers/knapsack-sprayer.png',
  'Portable Battery Sprayer': 'sprayers/portable-battery-sprayer.png',
  'Power Weeder & Tiller Machine': 'weeders/power-weeder-700g.png',
  'Mini Tiller 3800G': 'weeders/mini-tiller-3800g.png',
  'Heavy Duty Brush Cutter': 'brush-cutters/brush-cutter-4s.png',
  'Trolley Brush Cutter': 'brush-cutters/trolley-brush-cutter.png',
  'Centrifugal Water Pump WA30': 'pumps/petrol-water-pump-wa30.png',
  'High Discharge Water Pump 30R': 'pumps/water-pump-30r.png',
  'Diesel Generator 10 KVA': 'machinery/diesel-generator.jpg',
  'Industrial Earth Auger 63CC': 'machinery/earth-auger-6310.png',
  'Commercial Chaff Cutter Machine': 'machinery/chaff-cutter-9zp.png',
  'Heavy Wood Chipper Machine': 'machinery/wood-chipper-192g.png',
};

// Also discover any additional images in the directory to upload to Cloudinary catalog
const getAllFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
};

const feedImagesToCloudinary = async () => {
  console.log('====================================================');
  console.log('🚀 Starting Cloudinary Product Image Feeding Process');
  console.log('====================================================');

  const allImages = getAllFiles(assetsDir);
  console.log(`Found ${allImages.length} product image files in frontend/src/assets/products.\n`);

  const uploadedUrls = {};

  // 1. Upload every image to Cloudinary
  for (const imgPath of allImages) {
    const relativePath = path.relative(assetsDir, imgPath).replace(/\\/g, '/');
    const baseName = path.basename(imgPath, path.extname(imgPath));
    const publicId = `parani_mill_stores/products/${baseName}`;

    console.log(`Uploading: [${relativePath}] -> Cloudinary (${publicId})...`);

    try {
      const res = await cloudinary.uploader.upload(imgPath, {
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      });

      uploadedUrls[relativePath] = res.secure_url;
      uploadedUrls[baseName] = res.secure_url;
      console.log(`  ✓ Uploaded successfully: ${res.secure_url}`);
    } catch (err) {
      console.error(`  ❌ Failed to upload ${relativePath}:`, err.message);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log('🔥 Updating Firebase Firestore products collection with Cloudinary URLs...');
  console.log('----------------------------------------------------');

  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();

  if (snapshot.empty) {
    console.log('No products found in Firestore. Seeding products with images directly...');
  } else {
    let updatedCount = 0;
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      const p = doc.data();
      let matchedUrl = null;

      // Match by exact product name
      if (productAssetMap[p.name]) {
        const assetRel = productAssetMap[p.name];
        matchedUrl = uploadedUrls[assetRel];
      }

      // Fallback matching by keyword / slug
      if (!matchedUrl) {
        const lowerName = (p.name || '').toLowerCase();
        for (const [keyName, assetRel] of Object.entries(productAssetMap)) {
          if (lowerName.includes(keyName.toLowerCase()) || keyName.toLowerCase().includes(lowerName)) {
            matchedUrl = uploadedUrls[assetRel];
            break;
          }
        }
      }

      if (matchedUrl) {
        batch.update(doc.ref, {
          images: [matchedUrl],
          updatedAt: new Date().toISOString(),
        });
        console.log(`  🔗 Linked [${p.name}] -> ${matchedUrl}`);
        updatedCount++;
      } else {
        console.log(`  ⚠️ No local image match found for: ${p.name}`);
      }
    });

    await batch.commit();
    console.log(`\n🎉 Successfully updated ${updatedCount} products in Firebase Firestore with Cloudinary CDN URLs!`);
  }

  console.log('====================================================');
  console.log('All product images are now live on Cloudinary & synced to DB.');
  console.log('====================================================');
  process.exit(0);
};

feedImagesToCloudinary().catch((err) => {
  console.error('Fatal error feeding images:', err);
  process.exit(1);
});
