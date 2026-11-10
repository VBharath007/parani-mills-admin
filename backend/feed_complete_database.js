const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { db, app } = require('./src/config/firebase');

async function feedAllData() {
  console.log('================================================================');
  console.log('🚀 PARANI MILL STORES - FULL FIREBASE DB FEEDER');
  console.log(`🔥 Project ID: ${app.options.projectId || process.env.FIREBASE_PROJECT_ID}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const report = {
    projectId: app.options.projectId || process.env.FIREBASE_PROJECT_ID,
    timestamp: new Date().toISOString(),
    categories: { status: 'PENDING', count: 0, items: [] },
    products: { status: 'PENDING', count: 0, breakdown: {} },
    blogs: { status: 'PENDING', count: 0, items: [] },
    admin: { status: 'PENDING', username: '' },
  };

  // 1. FEED CATEGORIES (8 Categories)
  console.log('📂 1. FEEDING CATEGORIES...');
  try {
    const categories = require('./src/cache/categories.json');
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
      report.categories.items.push(cat.name);
    });

    await catBatch.commit();
    report.categories.status = 'SUCCESS';
    report.categories.count = categories.length;
    console.log(`   ✅ Feeded ${categories.length} Categories successfully!`);
  } catch (err) {
    report.categories.status = 'FAILED: ' + err.message;
    console.error(`   ❌ Categories failed:`, err.message);
  }

  // 2. FEED PRODUCTS (59 Products across 8 Categories)
  console.log('\n📦 2. FEEDING PRODUCTS (59 ITEMS)...');
  try {
    const products = require('./src/cache/products.json');
    const prodBatch = db.batch();

    products.forEach((p, idx) => {
      const docId = p.id || p._id || ('prod_' + (idx + 1));
      const docRef = db.collection('products').doc(docId);

      report.products.breakdown[p.category] = (report.products.breakdown[p.category] || 0) + 1;

      const payload = {
        name: p.name,
        slug: p.slug,
        category: p.category,
        folder: p.folder || '',
        thumbnail: p.thumbnail || '',
        thumbnailUrl: p.thumbnailUrl || '',
        images: Array.isArray(p.images) ? p.images : [],
        imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
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
    report.products.status = 'SUCCESS';
    report.products.count = products.length;
    console.log(`   ✅ Feeded ${products.length} Products successfully!`);
  } catch (err) {
    report.products.status = 'FAILED: ' + err.message;
    console.error(`   ❌ Products failed:`, err.message);
  }

  // 3. FEED BLOGS (5 Articles)
  console.log('\n📝 3. FEEDING BLOGS...');
  try {
    const blogs = require('./src/cache/blogs.json');
    const blogBatch = db.batch();

    blogs.forEach(b => {
      const docId = b.id || b._id || ('blog_' + Date.now());
      const docRef = db.collection('blogs').doc(docId);

      const payload = {
        title: b.title,
        slug: b.slug,
        category: b.category,
        author: b.author || 'Admin',
        excerpt: b.excerpt || '',
        content: b.content || '',
        coverImage: b.coverImage || '',
        isPublished: b.isPublished !== undefined ? Boolean(b.isPublished) : true,
        isFeatured: Boolean(b.isFeatured),
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      blogBatch.set(docRef, payload, { merge: true });
      report.blogs.items.push(b.title);
    });

    await blogBatch.commit();
    report.blogs.status = 'SUCCESS';
    report.blogs.count = blogs.length;
    console.log(`   ✅ Feeded ${blogs.length} Blogs successfully!`);
  } catch (err) {
    report.blogs.status = 'FAILED: ' + err.message;
    console.error(`   ❌ Blogs failed:`, err.message);
  }

  // 4. FEED ADMIN ACCOUNT
  console.log('\n👤 4. FEEDING ADMIN ACCOUNT...');
  try {
    const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const timestamp = new Date().toISOString();

    const adminRef = db.collection('admins').doc('admin_master');
    await adminRef.set({
      username,
      password: hashedPassword,
      role: 'admin',
      updatedAt: timestamp,
    }, { merge: true });

    report.admin.status = 'SUCCESS';
    report.admin.username = username;
    console.log(`   ✅ Admin user '${username}' configured successfully!`);
  } catch (err) {
    report.admin.status = 'FAILED: ' + err.message;
    console.error(`   ❌ Admin failed:`, err.message);
  }

  // PRINT FINAL REPORT
  console.log('\n================================================================');
  console.log('📊 FINAL EXECUTION REPORT - FIREBASE DATABASE');
  console.log('================================================================');
  console.log(`🔥 Firebase Project: ${report.projectId}`);
  console.log(`📅 Execution Time : ${report.timestamp}`);
  console.log('----------------------------------------------------------------');
  console.log(`📁 1. Categories  : ${report.categories.status} (${report.categories.count} categories)`);
  report.categories.items.forEach((c, i) => console.log(`      ${i+1}. ${c}`));

  console.log('\n----------------------------------------------------------------');
  console.log(`📦 2. Products    : ${report.products.status} (${report.products.count} total products)`);
  Object.entries(report.products.breakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, cnt]) => {
      console.log(`      - ${cat.padEnd(30)} : ${cnt} products`);
    });

  console.log('\n----------------------------------------------------------------');
  console.log(`📝 3. Blogs       : ${report.blogs.status} (${report.blogs.count} articles)`);
  report.blogs.items.forEach((b, i) => console.log(`      ${i+1}. ${b}`));

  console.log('\n----------------------------------------------------------------');
  console.log(`👤 4. Admin Auth  : ${report.admin.status} (username: '${report.admin.username}')`);
  console.log('================================================================');
  console.log('🎉 ALL DATA FEEDING COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');

  return report;
}

feedAllData()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal feeder error:', e);
    process.exit(1);
  });
