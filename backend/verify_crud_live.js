const http = require('http');

function req(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Connection': 'close' };
    let body = '';
    if (data) {
      body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: 5001,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runLiveVerification() {
  console.log('================================================================');
  console.log('🚀 LIVE BACKEND VERIFICATION: FETCH, CREATE, EDIT, DELETE & RETRY');
  console.log('================================================================\n');

  // STEP 1: INITIAL FETCH
  console.log('1️⃣ [FETCH] Fetching all current catalog products...');
  const initFetch = await req('/api/products');
  console.log(`   Status: ${initFetch.status} | Success: ${initFetch.data?.success}`);
  console.log(`   Initial Product Count: ${initFetch.data?.data?.length} (Expected: 59)\n`);

  // STEP 2: CATEGORIES & BLOGS FETCH
  console.log('2️⃣ [FETCH] Fetching Categories & Blogs...');
  const catRes = await req('/api/categories');
  await sleep(300);
  const blogRes = await req('/api/blogs');
  await sleep(300);
  console.log(`   Categories Count: ${catRes.data?.data?.length} (Expected: 8)`);
  console.log(`   Blogs Count     : ${blogRes.data?.data?.length} (Expected: 5)\n`);

  // STEP 3: AUTHENTICATION
  console.log('3️⃣ [AUTH] Logging in as Admin to obtain JWT Token...');
  const authRes = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  const token = authRes.data?.data?.token;
  console.log(`   Login Status: ${authRes.status} | Token Generated: ${token ? 'YES' : 'NO'}\n`);

  if (!token) {
    console.error('❌ Cannot proceed without admin token!');
    process.exit(1);
  }

  // STEP 4: CREATE TEST PRODUCT
  console.log('4️⃣ [CREATE] Creating a new demo equipment in DB...');
  const newProductPayload = {
    name: 'TEST HARVESTER DEMO 2026',
    category: 'Weeder',
    price: 32000,
    stock: 8,
    description: 'CRUD test equipment for live verification',
    isActive: true,
  };

  const createRes = await req('/api/products', 'POST', newProductPayload, token);
  const createdId = createRes.data?.data?._id;
  console.log(`   Status: ${createRes.status} | Created ID: ${createdId}`);
  console.log(`   Product Name: "${createRes.data?.data?.name}" | Price: ₹${createRes.data?.data?.price}\n`);

  await sleep(500);

  // STEP 5: VERIFY CREATION IN CATALOG
  console.log('5️⃣ [FETCH] Verifying count increment in catalog...');
  const postCreateFetch = await req('/api/products');
  console.log(`   New Product Count: ${postCreateFetch.data?.data?.length} (Expected: 60)\n`);

  // STEP 6: EDIT / UPDATE PRODUCT
  console.log('6️⃣ [EDIT / UPDATE] Updating product details (Price & Stock)...');
  const updatePayload = {
    name: 'TEST HARVESTER DEMO 2026 (PREMIUM PRO)',
    price: 38500,
    stock: 20,
  };
  const editRes = await req(`/api/products/${createdId}`, 'PUT', updatePayload, token);
  console.log(`   Status: ${editRes.status} | Success: ${editRes.data?.success}`);
  console.log(`   Updated Name : "${editRes.data?.data?.name}"`);
  console.log(`   Updated Price: ₹${editRes.data?.data?.price} | Stock: ${editRes.data?.data?.stock}\n`);

  await sleep(500);

  // STEP 7: FETCH SINGLE ITEM
  console.log('7️⃣ [FETCH SINGLE] Fetching single product by ID to confirm DB persistence...');
  const singleRes = await req(`/api/products/${createdId}`);
  console.log(`   Status: ${singleRes.status}`);
  console.log(`   Fetched Name : "${singleRes.data?.data?.name}"`);
  console.log(`   Fetched Price: ₹${singleRes.data?.data?.price}\n`);

  // STEP 8: DELETE PRODUCT
  console.log('8️⃣ [DELETE] Deleting test product to keep database clean...');
  const deleteRes = await req(`/api/products/${createdId}`, 'DELETE', null, token);
  console.log(`   Status: ${deleteRes.status} | Success: ${deleteRes.data?.success}`);
  console.log(`   Message: "${deleteRes.data?.message}"\n`);

  await sleep(500);

  // STEP 9: FINAL INTEGRITY CHECK
  console.log('9️⃣ [DATA INTEGRITY] Checking catalog count after deletion...');
  const finalFetch = await req('/api/products');
  console.log(`   Final Product Count: ${finalFetch.data?.data?.length} (Expected: 59)`);

  const success = 
    initFetch.data?.data?.length === 59 &&
    postCreateFetch.data?.data?.length === 60 &&
    editRes.data?.data?.price === 38500 &&
    deleteRes.data?.success === true &&
    finalFetch.data?.data?.length === 59;

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION RESULT: ${success ? 'ALL CRUD OPERATIONS PASSED 100% ✅' : 'FAILED ❌'}`);
  console.log('================================================================\n');

  process.exit(success ? 0 : 1);
}

runLiveVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
