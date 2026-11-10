const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./src/config/firebase');

async function restoreHonda() {
  console.log('🚀 Starting Honda Products & Category Restoration...');

  // 1. Delete 'ashvini n m' category from Firestore
  const catSnap = await db.collection('categories').get();
  for (const doc of catSnap.docs) {
    const data = doc.data();
    if (
      doc.id === 'IyI3pMxQy3xshxwKBzct' ||
      (data.name && data.name.toLowerCase().includes('ashv')) ||
      (data.slug && data.slug.toLowerCase().includes('ashv'))
    ) {
      console.log(`🗑️ Deleting category doc: ${doc.id} (${data.name})`);
      await doc.ref.delete();
    }
  }

  // 2. Add / ensure 'Honda Products' exists in Firestore categories
  const hondaSnap = await db.collection('categories').where('name', '==', 'Honda Products').get();
  let hondaDocId = '';
  if (hondaSnap.empty) {
    console.log('✨ Creating "Honda Products" category in Firestore...');
    const newDoc = await db.collection('categories').add({
      name: 'Honda Products',
      slug: 'honda-products',
      createdAt: '2026-10-26T13:26:31.622Z',
      updatedAt: new Date().toISOString(),
    });
    hondaDocId = newDoc.id;
    console.log(`✅ Created Honda Products with ID: ${hondaDocId}`);
  } else {
    hondaDocId = hondaSnap.docs[0].id;
    console.log(`ℹ️ Honda Products already exists with ID: ${hondaDocId}`);
  }

  // 3. Update blog_3 (Honda blog) to category 'Honda Products'
  const blogsSnap = await db.collection('blogs').get();
  for (const doc of blogsSnap.docs) {
    const b = doc.data();
    if (doc.id === 'blog_3' || (b.title && b.title.toLowerCase().includes('honda'))) {
      console.log(`📝 Restoring category for blog: ${doc.id} (${b.title}) to "Honda Products"`);
      await doc.ref.update({
        category: 'Honda Products',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 4. Update categories.json cache
  const catCachePath = path.join(__dirname, 'src/cache/categories.json');
  let cachedCats = [];
  try {
    cachedCats = JSON.parse(fs.readFileSync(catCachePath, 'utf8'));
  } catch (e) {
    cachedCats = [];
  }

  // Filter out any ashvini
  cachedCats = cachedCats.filter(c => !(c.name && c.name.toLowerCase().includes('ashv')));

  // Add Honda Products if not present
  if (!cachedCats.some(c => c.name === 'Honda Products')) {
    cachedCats.push({
      id: hondaDocId,
      name: 'Honda Products',
      slug: 'honda-products',
      createdAt: '2026-10-26T13:26:31.622Z',
      updatedAt: new Date().toISOString(),
    });
  }
  // Sort alphabetically
  cachedCats.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(catCachePath, JSON.stringify(cachedCats, null, 2), 'utf8');
  console.log(`✅ Updated ${catCachePath} with ${cachedCats.length} categories.`);

  // 5. Update blogs.json cache
  const blogsCachePath = path.join(__dirname, 'src/cache/blogs.json');
  if (fs.existsSync(blogsCachePath)) {
    try {
      let cachedBlogs = JSON.parse(fs.readFileSync(blogsCachePath, 'utf8'));
      cachedBlogs = cachedBlogs.map(b => {
        if (b.id === 'blog_3' || (b.title && b.title.toLowerCase().includes('honda'))) {
          return { ...b, category: 'Honda Products' };
        }
        return b;
      });
      fs.writeFileSync(blogsCachePath, JSON.stringify(cachedBlogs, null, 2), 'utf8');
      console.log(`✅ Updated ${blogsCachePath}`);
    } catch (e) {
      console.warn('Could not update blogs.json:', e.message);
    }
  }

  // 6. Verify products
  const prodsSnap = await db.collection('products').where('category', '==', 'Honda Products').get();
  console.log(`🎉 Verification: Found ${prodsSnap.size} products under "Honda Products" in Firestore:`);
  prodsSnap.forEach(d => console.log(`   - ${d.data().name}`));

  console.log('\n=============================================');
  console.log('✅ ALL HONDA PRODUCTS & CATEGORIES RESTORED!');
  console.log('=============================================');
}

restoreHonda()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error during restore:', err);
    process.exit(1);
  });
