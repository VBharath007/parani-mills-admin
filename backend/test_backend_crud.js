const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5001/api';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const safeFetch = async (url, options = {}) => {
  await sleep(250);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Connection': 'close',
      ...(options.headers || {})
    }
  });
  return res.json();
};

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 PARANI MILL STORES - FULL BACKEND CRUD & HEALTH TEST SUITE');
  console.log(`📡 Testing API Endpoint: ${API_BASE}`);
  console.log('===============================================================\n');

  const results = {
    fetchProducts: false,
    fetchByCategory: false,
    fetchCategories: false,
    fetchBlogs: false,
    createProduct: false,
    fetchSingleProduct: false,
    editProduct: false,
    deleteProduct: false,
    dataIntegrityCheck: false,
  };

  let createdTestProductId = null;

  // 1. TEST FETCH ALL PRODUCTS
  try {
    process.stdout.write('1. Testing FETCH ALL PRODUCTS (GET /api/products)... ');
    const res = await safeFetch(`${API_BASE}/products`);
    if (res.success && Array.isArray(res.data) && res.data.length === 59) {
      console.log(`✅ PASSED (${res.data.length} products verified)`);
      results.fetchProducts = true;
    } else {
      console.log(`❌ FAILED (Count was: ${res.data ? res.data.length : 'null'})`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }

  // 2. TEST FETCH BY CATEGORY (Brush Cutter)
  try {
    process.stdout.write('2. Testing CATEGORY FILTER (GET /api/products?category=Brush Cutter)... ');
    const res = await safeFetch(`${API_BASE}/products?category=Brush%20Cutter`);
    if (res.success && Array.isArray(res.data) && res.data.length === 10) {
      console.log(`✅ PASSED (10 Brush Cutters verified)`);
      results.fetchByCategory = true;
    } else {
      console.log(`❌ FAILED (Count was: ${res.data ? res.data.length : 'null'})`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }

  // 3. TEST FETCH CATEGORIES
  try {
    process.stdout.write('3. Testing FETCH CATEGORIES (GET /api/categories)... ');
    const res = await safeFetch(`${API_BASE}/categories`);
    if (res.success && Array.isArray(res.data) && res.data.length === 8) {
      console.log(`✅ PASSED (8 Categories verified: ${res.data.map(c => c.name).join(', ')})`);
      results.fetchCategories = true;
    } else {
      console.log(`❌ FAILED (Count was: ${res.data ? res.data.length : 'null'})`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }

  // 4. TEST FETCH BLOGS
  try {
    process.stdout.write('4. Testing FETCH BLOGS (GET /api/blogs)... ');
    const res = await safeFetch(`${API_BASE}/blogs`);
    if (res.success && Array.isArray(res.data) && res.data.length === 5) {
      console.log(`✅ PASSED (5 Articles verified)`);
      results.fetchBlogs = true;
    } else {
      console.log(`❌ FAILED (Count was: ${res.data ? res.data.length : 'null'})`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }

  // 5. TEST CREATE PRODUCT (POST /api/products)
  try {
    process.stdout.write('5. Testing CREATE PRODUCT (POST /api/products)... ');
    const testPayload = {
      name: 'TEST ROTARY WEEDER DEMO 2026',
      category: 'Weeder',
      price: 18500,
      stock: 12,
      description: 'Automated test product for CRUD validation',
      isActive: true,
      thumbnail: 'thumbnail.png',
      images: ['thumbnail.png'],
      specs: { 'ENGINE': '4 STROKE', 'POWER': '7 HP' }
    };

    const res = await safeFetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (res.success && res.data && (res.data._id || res.data.id)) {
      createdTestProductId = res.data._id || res.data.id;
      console.log(`✅ PASSED (Created ID: ${createdTestProductId})`);
      results.createProduct = true;
    } else {
      console.log(`❌ FAILED: ${JSON.stringify(res)}`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }

  // 6. TEST FETCH SINGLE PRODUCT (GET /api/products/:id)
  if (createdTestProductId) {
    try {
      process.stdout.write(`6. Testing FETCH SINGLE PRODUCT (GET /api/products/${createdTestProductId})... `);
      const res = await safeFetch(`${API_BASE}/products/${createdTestProductId}`);
      if (res.success && res.data && res.data.name === 'TEST ROTARY WEEDER DEMO 2026') {
        console.log(`✅ PASSED (Fetched correctly)`);
        results.fetchSingleProduct = true;
      } else {
        console.log(`❌ FAILED`);
      }
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
  }

  // 7. TEST EDIT / UPDATE PRODUCT (PUT /api/products/:id)
  if (createdTestProductId) {
    try {
      process.stdout.write(`7. Testing EDIT / UPDATE PRODUCT (PUT /api/products/${createdTestProductId})... `);
      const updatePayload = {
        name: 'TEST ROTARY WEEDER DEMO 2026 (UPDATED)',
        price: 19999,
        stock: 25,
      };

      const res = await safeFetch(`${API_BASE}/products/${createdTestProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (res.success && res.data && res.data.price === 19999 && res.data.stock === 25) {
        console.log(`✅ PASSED (Updated Price to ₹19,999, Stock to 25)`);
        results.editProduct = true;
      } else {
        console.log(`❌ FAILED: ${JSON.stringify(res)}`);
      }
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
  }

  // 8. TEST DELETE PRODUCT (DELETE /api/products/:id)
  if (createdTestProductId) {
    try {
      process.stdout.write(`8. Testing DELETE PRODUCT (DELETE /api/products/${createdTestProductId})... `);
      const res = await safeFetch(`${API_BASE}/products/${createdTestProductId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        console.log(`✅ PASSED (Deleted from Firestore & Cache)`);
        results.deleteProduct = true;
      } else {
        console.log(`❌ FAILED: ${JSON.stringify(res)}`);
      }
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
  }

  // 9. DATA INTEGRITY CHECK (Verify exact 59 products remain after cleanup)
  try {
    process.stdout.write('9. Testing FINAL DATABASE INTEGRITY (59 Products check)... ');
    const res = await safeFetch(`${API_BASE}/products`);
    if (res.success && res.data.length === 59) {
      console.log(`✅ PASSED (Clean 59 catalog intact)`);
      results.dataIntegrityCheck = true;
    } else {
      console.log(`❌ WARNING (Current count is ${res.data.length})`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }

  console.log('\n===============================================================');
  console.log('🏁 FINAL TEST RESULTS SUMMARY:');
  console.log('===============================================================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test.padEnd(25)} : ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(Boolean);
  console.log('---------------------------------------------------------------');
  console.log(`🎉 OVERALL HEALTH: ${allPassed ? 'ALL SYSTEMS OPERATIONAL (100% PASS)' : 'SOME TESTS FAILED'}`);
  console.log('===============================================================\n');

  return results;
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  });
