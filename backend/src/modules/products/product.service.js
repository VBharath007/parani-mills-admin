const { db } = require('../../config/firebase');
const cacheService = require('../../cache/cache.service');

const generateSlug = (text) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const formatDoc = (doc) => {
  const data = doc.data();
  return {
    _id: doc.id,
    id: doc.id,
    ...data,
  };
};

/**
 * Create a new product in Firestore & local cache
 */
const createProduct = async (productData) => {
  const productsRef = db.collection('products');
  const timestamp = new Date().toISOString();

  const newProduct = {
    name: productData.name ? productData.name.trim().toUpperCase() : '',
    slug: productData.slug || generateSlug(productData.name),
    description: productData.description ? productData.description.trim() : '',
    price: Number(productData.price) || 0,
    category: productData.category ? productData.category.trim() : 'agri',
    thumbnail: productData.thumbnail ? productData.thumbnail.trim() : (Array.isArray(productData.images) && productData.images[0] ? productData.images[0] : ''),
    thumbnailUrl: productData.thumbnailUrl ? productData.thumbnailUrl.trim() : '',
    images: Array.isArray(productData.images) 
      ? productData.images 
      : (productData.image ? [productData.image] : []),
    imageUrls: Array.isArray(productData.imageUrls) ? productData.imageUrls : [],
    specs: (() => {
      const cleanSpecs = {};
      if (productData.specs && typeof productData.specs === 'object') {
        Object.entries(productData.specs).forEach(([k, v]) => {
          if (k && String(k).trim()) {
            cleanSpecs[String(k).trim().toUpperCase()] = String(v || '').trim().toUpperCase();
          }
        });
      }
      return cleanSpecs;
    })(),
    stroke: productData.stroke ? String(productData.stroke).trim() : '',
    stock: productData.stock !== undefined ? Number(productData.stock) : 0,
    isActive: productData.isActive !== undefined ? Boolean(productData.isActive) : true,
    isProductOfTheMonth: productData.isProductOfTheMonth !== undefined ? Boolean(productData.isProductOfTheMonth) : false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  let docId = 'prod_' + Date.now();
  try {
    if (newProduct.isProductOfTheMonth) {
      const prevDocs = await productsRef.where('isProductOfTheMonth', '==', true).get();
      if (!prevDocs.empty) {
        const batch = db.batch();
        prevDocs.forEach(d => batch.update(d.ref, { isProductOfTheMonth: false }));
        await batch.commit();
      }
    }
    const docRef = await productsRef.add(newProduct);
    docId = docRef.id;
  } catch (err) {
    console.warn('[Products Service] Firestore write failed (quota?), saving to local cache:', err.message);
  }

  const created = {
    _id: docId,
    id: docId,
    ...newProduct,
  };

  const currentProducts = cacheService.getProducts();
  if (newProduct.isProductOfTheMonth) {
    currentProducts.forEach(p => { p.isProductOfTheMonth = false; });
  }
  cacheService.setProducts([created, ...currentProducts]);

  return created;
};

/**
 * Get all products (with memory cache + Firestore fallback protection)
 */
const getProducts = async (query = {}) => {
  let products = [];

  if (cacheService.isProductsCacheFresh()) {
    products = [...cacheService.getProducts()];
  } else {
    try {
      const productsRef = db.collection('products');
      const snapshot = await productsRef.get();
      snapshot.forEach((doc) => {
        products.push(formatDoc(doc));
      });
      if (products.length > 0) {
        cacheService.setProducts(products);
      } else {
        products = [...cacheService.getProducts()];
      }
    } catch (err) {
      console.warn('[Products Service] Firestore fetch failed, serving from local cache:', err.message);
      products = [...cacheService.getProducts()];
    }
  }

  // Filter out any unwanted 'Other' machinery items
  products = products.filter((p) => p.category && p.category !== 'Other');

  // Filter in memory for maximum search flexibility
  if (query.category) {
    const targetCat = query.category.toLowerCase().trim();
    products = products.filter(
      (p) => p.category && p.category.toLowerCase() === targetCat
    );
  }

  if (query.isActive !== undefined) {
    const isTargetActive = query.isActive === 'true' || query.isActive === true;
    products = products.filter((p) => Boolean(p.isActive) === isTargetActive);
  }

  if (query.search) {
    const term = query.search.toLowerCase().trim();
    products = products.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }

  // Sort by createdAt descending
  products.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return products;
};

/**
 * Get a single product by ID
 */
const getProductById = async (id) => {
  if (!id) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      return formatDoc(doc);
    }
    // If not found by doc id, query by slug in Firestore
    const slugSnapshot = await db.collection('products').where('slug', '==', id.toLowerCase().trim()).limit(1).get();
    if (!slugSnapshot.empty) {
      return formatDoc(slugSnapshot.docs[0]);
    }
  } catch (err) {
    console.warn('[Products Service] Firestore getById failed, checking cache:', err.message);
  }

  const cleanId = id.toString().toLowerCase().trim();
  const cached = cacheService.getProducts().find((p) => 
    p.id === id || 
    p._id === id || 
    (p.slug && p.slug.toLowerCase().trim() === cleanId)
  );
  if (cached) {
    return cached;
  }

  const error = new Error('Product not found');
  error.statusCode = 404;
  throw error;
};

/**
 * Update an existing product by ID
 */
const updateProduct = async (id, updateData) => {
  if (!id) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanUpdate = { ...updateData };
  delete cleanUpdate._id;
  delete cleanUpdate.id;

  if (cleanUpdate.name) {
    cleanUpdate.name = cleanUpdate.name.trim().toUpperCase();
    cleanUpdate.slug = cleanUpdate.slug ? generateSlug(cleanUpdate.slug) : generateSlug(cleanUpdate.name);
  }

  if (cleanUpdate.price !== undefined) {
    cleanUpdate.price = Number(cleanUpdate.price);
  }

  if (cleanUpdate.stock !== undefined) {
    cleanUpdate.stock = Number(cleanUpdate.stock);
  }

  if (cleanUpdate.thumbnail !== undefined) {
    cleanUpdate.thumbnail = typeof cleanUpdate.thumbnail === 'string' ? cleanUpdate.thumbnail.trim() : '';
  }

  if (cleanUpdate.thumbnailUrl !== undefined) {
    cleanUpdate.thumbnailUrl = typeof cleanUpdate.thumbnailUrl === 'string' ? cleanUpdate.thumbnailUrl.trim() : '';
  }

  if (cleanUpdate.images !== undefined) {
    cleanUpdate.images = Array.isArray(cleanUpdate.images)
      ? cleanUpdate.images
      : (cleanUpdate.images ? [cleanUpdate.images] : []);
  } else if (cleanUpdate.image !== undefined) {
    cleanUpdate.images = cleanUpdate.image ? [cleanUpdate.image] : [];
    delete cleanUpdate.image;
  }

  if (cleanUpdate.imageUrls !== undefined) {
    cleanUpdate.imageUrls = Array.isArray(cleanUpdate.imageUrls) ? cleanUpdate.imageUrls : [];
  }

  if (cleanUpdate.specs !== undefined) {
    const cleanSpecs = {};
    if (typeof cleanUpdate.specs === 'object' && cleanUpdate.specs !== null) {
      Object.entries(cleanUpdate.specs).forEach(([k, v]) => {
        if (k && String(k).trim()) {
          cleanSpecs[String(k).trim().toUpperCase()] = String(v || '').trim().toUpperCase();
        }
      });
    }
    cleanUpdate.specs = cleanSpecs;
  }

  if (cleanUpdate.stroke !== undefined) {
    cleanUpdate.stroke = String(cleanUpdate.stroke).trim();
  }

  if (cleanUpdate.isProductOfTheMonth !== undefined) {
    cleanUpdate.isProductOfTheMonth = Boolean(cleanUpdate.isProductOfTheMonth);
  }

  cleanUpdate.updatedAt = new Date().toISOString();

  let updatedProduct = null;
  try {
    if (cleanUpdate.isProductOfTheMonth) {
      const prevDocs = await db.collection('products').where('isProductOfTheMonth', '==', true).get();
      if (!prevDocs.empty) {
        const batch = db.batch();
        prevDocs.forEach(d => {
          if (d.id !== id) batch.update(d.ref, { isProductOfTheMonth: false });
        });
        await batch.commit();
      }
    }

    const docRef = db.collection('products').doc(id);
    await docRef.update(cleanUpdate);
    const updatedDoc = await docRef.get();
    if (updatedDoc.exists) {
      updatedProduct = formatDoc(updatedDoc);
    }
  } catch (err) {
    console.warn('[Products Service] Firestore update failed (quota?), updating in cache:', err.message);
  }

  const products = cacheService.getProducts();
  if (cleanUpdate.isProductOfTheMonth) {
    products.forEach(p => {
      if ((p.id !== id && p._id !== id) && p.isProductOfTheMonth) {
        p.isProductOfTheMonth = false;
      }
    });
  }
  const idx = products.findIndex((p) => p.id === id || p._id === id);
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...cleanUpdate };
    cacheService.setProducts([...products]);
    return updatedProduct || products[idx];
  }

  if (updatedProduct) return updatedProduct;
  const error = new Error('Product not found');
  error.statusCode = 404;
  throw error;
};

/**
 * Delete a product by ID
 */
const deleteProduct = async (id) => {
  if (!id) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  let existingData = null;
  try {
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      existingData = formatDoc(doc);
      await docRef.delete();
    }
  } catch (err) {
    console.warn('[Products Service] Firestore delete failed, deleting from cache:', err.message);
  }

  const products = cacheService.getProducts();
  const idx = products.findIndex((p) => p.id === id || p._id === id);
  if (idx !== -1) {
    if (!existingData) existingData = products[idx];
    products.splice(idx, 1);
    cacheService.setProducts([...products]);
    return existingData;
  }

  if (existingData) return existingData;
  const error = new Error('Product not found');
  error.statusCode = 404;
  throw error;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
