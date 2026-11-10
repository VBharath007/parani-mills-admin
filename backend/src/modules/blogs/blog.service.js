const { db } = require('../../config/firebase');
const cacheService = require('../../cache/cache.service');

const DEFAULT_BLOG_TOPICS = [
  'Equipment Guides',
  'Farming Tips',
  'Maintenance & Service',
  'Buying Guide',
  'Technical Reviews',
  'General',
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

const formatDoc = (doc) => {
  const data = doc.data();
  return {
    _id: doc.id,
    id: doc.id,
    ...data,
  };
};

/**
 * Create a new blog post in Firestore & local cache
 */
const createBlog = async (blogData) => {
  const blogsRef = db.collection('blogs');
  const timestamp = new Date().toISOString();

  const newBlog = {
    title: blogData.title ? blogData.title.trim() : '',
    slug: blogData.slug || generateSlug(blogData.title),
    content: blogData.content ? blogData.content.trim() : '',
    excerpt: blogData.excerpt ? blogData.excerpt.trim() : '',
    coverImage: blogData.coverImage || blogData.image || '',
    author: blogData.author ? blogData.author.trim() : 'Admin',
    category: blogData.category ? blogData.category.trim() : 'General',
    isPublished: blogData.isPublished !== undefined ? Boolean(blogData.isPublished) : true,
    isFeatured: blogData.isFeatured !== undefined ? Boolean(blogData.isFeatured) : false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  let docId = 'blog_' + Date.now();
  try {
    if (newBlog.isFeatured) {
      const featuredDocs = await blogsRef.where('isFeatured', '==', true).get();
      if (!featuredDocs.empty) {
        const batch = db.batch();
        featuredDocs.forEach((d) => {
          batch.update(d.ref, { isFeatured: false });
        });
        await batch.commit();
      }
    }
    const docRef = await blogsRef.add(newBlog);
    docId = docRef.id;
  } catch (err) {
    console.warn('[Blogs Service] Firestore add failed (quota?), saving to cache:', err.message);
  }

  const created = {
    _id: docId,
    id: docId,
    ...newBlog,
  };

  if (newBlog.category) {
    createBlogTopic({ name: newBlog.category }).catch(() => {});
  }

  const current = cacheService.getBlogs();
  cacheService.setBlogs([created, ...current]);

  return created;
};

/**
 * Get all blogs (with memory cache + Firestore fallback protection)
 */
const getBlogs = async (query = {}) => {
  let blogs = [];

  if (cacheService.isBlogsCacheFresh()) {
    blogs = [...cacheService.getBlogs()];
  } else {
    try {
      const blogsRef = db.collection('blogs');
      const snapshot = await blogsRef.get();
      snapshot.forEach((doc) => {
        blogs.push(formatDoc(doc));
      });
      if (blogs.length > 0) {
        cacheService.setBlogs(blogs);
      } else {
        blogs = [...cacheService.getBlogs()];
      }
    } catch (err) {
      console.warn('[Blogs Service] Firestore read failed, serving from cache:', err.message);
      blogs = [...cacheService.getBlogs()];
    }
  }

  if (query.isPublished !== undefined) {
    const isTargetPublished = query.isPublished === 'true' || query.isPublished === true;
    blogs = blogs.filter((b) => Boolean(b.isPublished) === isTargetPublished);
  }

  if (query.category) {
    const targetCat = query.category.toLowerCase().trim();
    blogs = blogs.filter((b) => b.category && b.category.toLowerCase() === targetCat);
  }

  if (query.search) {
    const term = query.search.toLowerCase().trim();
    blogs = blogs.filter(
      (b) =>
        (b.title && b.title.toLowerCase().includes(term)) ||
        (b.content && b.content.toLowerCase().includes(term)) ||
        (b.excerpt && b.excerpt.toLowerCase().includes(term)) ||
        (b.category && b.category.toLowerCase().includes(term))
    );
  }

  // Sort by createdAt descending
  blogs.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return blogs;
};

/**
 * Get single blog post by ID
 */
const getBlogById = async (id) => {
  if (!id) {
    const error = new Error('Blog ID is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const docRef = db.collection('blogs').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      return formatDoc(doc);
    }
  } catch (err) {
    console.warn('[Blogs Service] Firestore getById failed, checking cache:', err.message);
  }

  const cached = cacheService.getBlogs().find((b) => b.id === id || b._id === id || b.slug === id);
  if (cached) return cached;

  const error = new Error('Blog post not found');
  error.statusCode = 404;
  throw error;
};

/**
 * Update an existing blog post by ID
 */
const updateBlog = async (id, updateData) => {
  if (!id) {
    const error = new Error('Blog ID is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanUpdate = { ...updateData };
  delete cleanUpdate._id;
  delete cleanUpdate.id;

  if (cleanUpdate.title) {
    cleanUpdate.title = cleanUpdate.title.trim();
    if (!cleanUpdate.slug) {
      cleanUpdate.slug = generateSlug(cleanUpdate.title);
    }
  }

  if (cleanUpdate.isPublished !== undefined) {
    cleanUpdate.isPublished = Boolean(cleanUpdate.isPublished);
  }

  if (cleanUpdate.isFeatured !== undefined) {
    cleanUpdate.isFeatured = Boolean(cleanUpdate.isFeatured);
  }

  if (cleanUpdate.image !== undefined && cleanUpdate.coverImage === undefined) {
    cleanUpdate.coverImage = cleanUpdate.image;
    delete cleanUpdate.image;
  }

  cleanUpdate.updatedAt = new Date().toISOString();

  let updatedDocData = null;
  try {
    const docRef = db.collection('blogs').doc(id);
    await docRef.update(cleanUpdate);
    const doc = await docRef.get();
    if (doc.exists) {
      updatedDocData = formatDoc(doc);
    }
  } catch (err) {
    console.warn('[Blogs Service] Firestore update failed, updating cache:', err.message);
  }

  if (cleanUpdate.category) {
    createBlogTopic({ name: cleanUpdate.category }).catch(() => {});
  }

  const blogs = cacheService.getBlogs();
  const idx = blogs.findIndex((b) => b.id === id || b._id === id);
  if (idx !== -1) {
    blogs[idx] = { ...blogs[idx], ...cleanUpdate };
    cacheService.setBlogs([...blogs]);
    return updatedDocData || blogs[idx];
  }

  if (updatedDocData) return updatedDocData;
  const error = new Error('Blog post not found');
  error.statusCode = 404;
  throw error;
};

/**
 * Delete a blog post by ID
 */
const deleteBlog = async (id) => {
  if (!id) {
    const error = new Error('Blog ID is required');
    error.statusCode = 400;
    throw error;
  }

  let existingData = null;
  try {
    const docRef = db.collection('blogs').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      existingData = formatDoc(doc);
      await docRef.delete();
    }
  } catch (err) {
    console.warn('[Blogs Service] Firestore delete failed, deleting from cache:', err.message);
  }

  const blogs = cacheService.getBlogs();
  const idx = blogs.findIndex((b) => b.id === id || b._id === id);
  if (idx !== -1) {
    if (!existingData) existingData = blogs[idx];
    blogs.splice(idx, 1);
    cacheService.setBlogs([...blogs]);
    return existingData;
  }

  if (existingData) return existingData;
  const error = new Error('Blog post not found');
  error.statusCode = 404;
  throw error;
};

/**
 * BLOG TOPICS CRUD (Completely isolated from Store Product Categories!)
 */
const getBlogTopics = async () => {
  if (cacheService.isBlogTopicsCacheFresh()) {
    return cacheService.getBlogTopics();
  }

  let topics = [];
  try {
    const topicsRef = db.collection('blog_topics');
    const snapshot = await topicsRef.orderBy('name', 'asc').get();
    snapshot.forEach(doc => {
      topics.push({ id: doc.id, ...doc.data() });
    });

    if (topics.length === 0) {
      topics = DEFAULT_BLOG_TOPICS.map(name => ({
        id: 'topic_' + generateSlug(name),
        name,
        slug: generateSlug(name),
      }));
    }
    cacheService.setBlogTopics(topics);
  } catch (err) {
    console.warn('[Blog Topics Service] Firestore read failed, serving from cache:', err.message);
    topics = cacheService.getBlogTopics();
    if (topics.length === 0) {
      topics = DEFAULT_BLOG_TOPICS.map(name => ({
        id: 'topic_' + generateSlug(name),
        name,
        slug: generateSlug(name),
      }));
    }
  }

  return topics;
};

const createBlogTopic = async ({ name }) => {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const err = new Error('Topic name is required');
    err.statusCode = 400;
    throw err;
  }
  const slug = generateSlug(trimmed);
  const newTopic = {
    name: trimmed,
    slug,
    createdAt: new Date().toISOString(),
  };

  let docId = 'topic_' + Date.now();
  try {
    const existing = await db.collection('blog_topics').where('slug', '==', slug).get();
    if (!existing.empty) {
      return { id: existing.docs[0].id, ...existing.docs[0].data() };
    }
    const docRef = await db.collection('blog_topics').add(newTopic);
    docId = docRef.id;
  } catch (err) {
    console.warn('[Blog Topics Service] Firestore add failed:', err.message);
  }

  const created = { id: docId, ...newTopic };
  const current = cacheService.getBlogTopics();
  if (!current.some(t => t.name.toLowerCase() === trimmed.toLowerCase() || t.slug === slug)) {
    cacheService.setBlogTopics([...current, created]);
  }
  return created;
};

const updateBlogTopic = async (idOrName, { name }) => {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const err = new Error('Topic name is required');
    err.statusCode = 400;
    throw err;
  }
  const slug = generateSlug(trimmed);
  let oldName = idOrName;

  try {
    const topicsRef = db.collection('blog_topics');
    let doc = null;
    try {
      const direct = await topicsRef.doc(idOrName).get();
      if (direct.exists) doc = direct;
    } catch (e) {}

    if (!doc) {
      const snap = await topicsRef.where('name', '==', idOrName).get();
      if (!snap.empty) doc = snap.docs[0];
    }

    if (doc && doc.exists) {
      oldName = doc.data().name;
      await doc.ref.update({ name: trimmed, slug, updatedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.warn('[Blog Topics Service] Firestore update failed:', err.message);
  }

  const current = cacheService.getBlogTopics();
  const idx = current.findIndex(t => t.id === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
  if (idx !== -1) {
    oldName = current[idx].name;
    current[idx] = { ...current[idx], name: trimmed, slug };
    cacheService.setBlogTopics([...current]);
  }

  // Update only blogs using this topic
  try {
    const blogsSnap = await db.collection('blogs').where('category', '==', oldName).get();
    if (!blogsSnap.empty) {
      const batch = db.batch();
      blogsSnap.forEach(d => {
        batch.update(d.ref, { category: trimmed, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('[Blog Topics Service] Updating blogs topic failed:', e.message);
  }

  const blogs = cacheService.getBlogs();
  blogs.forEach(b => {
    if (b.category && b.category.toLowerCase() === oldName.toLowerCase()) {
      b.category = trimmed;
    }
  });
  cacheService.setBlogs([...blogs]);

  return { id: idOrName, name: trimmed, slug };
};

const deleteBlogTopic = async (idOrName) => {
  let topicName = idOrName;
  try {
    const topicsRef = db.collection('blog_topics');
    let doc = null;
    try {
      const direct = await topicsRef.doc(idOrName).get();
      if (direct.exists) doc = direct;
    } catch (e) {}

    if (!doc) {
      const snap = await topicsRef.where('name', '==', idOrName).get();
      if (!snap.empty) doc = snap.docs[0];
    }

    if (doc && doc.exists) {
      topicName = doc.data().name;
      await doc.ref.delete();
    }
  } catch (err) {
    console.warn('[Blog Topics Service] Firestore delete failed:', err.message);
  }

  const current = cacheService.getBlogTopics();
  cacheService.setBlogTopics(current.filter(t => t.id !== idOrName && t.name.toLowerCase() !== idOrName.toLowerCase()));

  // Reassign only blogs with this topic to 'General'
  try {
    const blogsSnap = await db.collection('blogs').where('category', '==', topicName).get();
    if (!blogsSnap.empty) {
      const batch = db.batch();
      blogsSnap.forEach(d => {
        batch.update(d.ref, { category: 'General', updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('[Blog Topics Service] Reassigning blogs failed:', e.message);
  }

  const blogs = cacheService.getBlogs();
  blogs.forEach(b => {
    if (b.category && b.category.toLowerCase() === topicName.toLowerCase()) {
      b.category = 'General';
    }
  });
  cacheService.setBlogs([...blogs]);

  return { message: 'Blog topic deleted successfully' };
};

module.exports = {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogTopics,
  createBlogTopic,
  updateBlogTopic,
  deleteBlogTopic,
  DEFAULT_BLOG_TOPICS,
};
