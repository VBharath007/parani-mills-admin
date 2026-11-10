const { db } = require('../../config/firebase');
const cacheService = require('../../cache/cache.service');

const DEFAULT_CATEGORIES = [
  'Brush Cutter',
  'Chaff Cutter & Wood Chipper',
  'Earth Augur',
  'Engines',
  'Honda Products',
  'Sprayer',
  'Water Pump',
  'Weeder',
];

const generateSlug = (text) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getCategories = async () => {
  if (cacheService.isCategoriesCacheFresh()) {
    return cacheService.getCategories();
  }

  let categories = [];
  try {
    const categoriesRef = db.collection('categories');
    const snapshot = await categoriesRef.orderBy('name', 'asc').get();

    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });

    if (categories.length === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        categories.push({
          id: 'cat_' + generateSlug(name),
          name,
          slug: generateSlug(name),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (categories.length > 0) {
      cacheService.setCategories(categories);
    }
  } catch (err) {
    console.warn('[Categories Service] Firestore read failed, serving from cache:', err.message);
    categories = cacheService.getCategories();
  }

  categories.sort((a, b) => a.name.localeCompare(b.name));
  return categories;
};

const createCategory = async ({ name }) => {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    const err = new Error('Category name is required');
    err.statusCode = 400;
    throw err;
  }

  const categoriesRef = db.collection('categories');
  const slug = generateSlug(trimmedName);

  let docId = 'cat_' + Date.now();
  const timestamp = new Date().toISOString();
  const newCat = {
    name: trimmedName,
    slug,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    const existing = await categoriesRef.where('slug', '==', slug).get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    const docRef = await categoriesRef.add(newCat);
    docId = docRef.id;
  } catch (err) {
    console.warn('[Categories Service] Firestore add failed, adding to cache:', err.message);
  }

  const created = { id: docId, ...newCat };
  const current = cacheService.getCategories();
  if (!current.some(c => c.slug === slug || c.name.toLowerCase() === trimmedName.toLowerCase())) {
    cacheService.setCategories([...current, created]);
  }

  return created;
};

const updateCategory = async (idOrName, { name }) => {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    const err = new Error('Category name is required');
    err.statusCode = 400;
    throw err;
  }

  const slug = generateSlug(trimmedName);
  const timestamp = new Date().toISOString();
  let oldName = idOrName;

  try {
    const categoriesRef = db.collection('categories');
    let doc = null;
    try {
      const directDoc = await categoriesRef.doc(idOrName).get();
      if (directDoc.exists) doc = directDoc;
    } catch (e) {}

    if (!doc) {
      const snap = await categoriesRef.where('name', '==', idOrName).get();
      if (!snap.empty) doc = snap.docs[0];
    }

    if (doc && doc.exists) {
      oldName = doc.data().name;
      await doc.ref.update({ name: trimmedName, slug, updatedAt: timestamp });
    }
  } catch (err) {
    console.warn('[Categories Service] Firestore update failed, updating cache:', err.message);
  }

  const current = cacheService.getCategories();
  const idx = current.findIndex(c => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase());
  if (idx !== -1) {
    oldName = current[idx].name;
    current[idx] = { ...current[idx], name: trimmedName, slug, updatedAt: timestamp };
    cacheService.setCategories([...current]);
  }

  // Update products with this category in cache
  const products = cacheService.getProducts();
  let updatedCount = 0;
  products.forEach(p => {
    if (p.category && p.category.toLowerCase() === oldName.toLowerCase()) {
      p.category = trimmedName;
      updatedCount++;
    }
  });

  return { id: idOrName, name: trimmedName, slug };
};

const deleteCategory = async (idOrName) => {
  let catName = idOrName;
  try {
    const categoriesRef = db.collection('categories');
    let doc = null;
    try {
      const directDoc = await categoriesRef.doc(idOrName).get();
      if (directDoc.exists) doc = directDoc;
    } catch (e) {}

    if (!doc) {
      const snap = await categoriesRef.where('name', '==', idOrName).get();
      if (!snap.empty) doc = snap.docs[0];
    }

    if (doc && doc.exists) {
      catName = doc.data().name;
    }

    // Safeguard: Do not allow deletion of the core store catalog categories
    const isCoreCategory = DEFAULT_CATEGORIES.some(
      c => c.toLowerCase() === (catName || '').toLowerCase() || c.toLowerCase() === (idOrName || '').toLowerCase()
    );
    if (isCoreCategory) {
      const err = new Error(`Cannot delete core category "${catName || idOrName}". This category is linked to store catalog products.`);
      err.statusCode = 400;
      throw err;
    }

    if (doc && doc.exists) {
      await doc.ref.delete();
    }
  } catch (err) {
    if (err.statusCode === 400) throw err;
    console.warn('[Categories Service] Firestore delete failed, deleting from cache:', err.message);
  }

  const current = cacheService.getCategories();
  const filtered = current.filter(c => c.id !== idOrName && c.name.toLowerCase() !== idOrName.toLowerCase());
  cacheService.setCategories(filtered);

  // Reassign products to Other
  const products = cacheService.getProducts();
  products.forEach(p => {
    if (p.category && p.category.toLowerCase() === catName.toLowerCase()) {
      p.category = 'Other';
    }
  });
  cacheService.setProducts([...products]);

  return { message: 'Category deleted successfully' };
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  DEFAULT_CATEGORIES,
};
