const fs = require('fs');
const path = require('path');

const cacheDir = __dirname;
const productsFilePath = path.join(cacheDir, 'products.json');
const categoriesFilePath = path.join(cacheDir, 'categories.json');
const blogsFilePath = path.join(cacheDir, 'blogs.json');
const blogTopicsFilePath = path.join(cacheDir, 'blog_topics.json');

// Memory store
let memoryProducts = null;
let memoryCategories = null;
let memoryBlogs = null;
let memoryBlogTopics = null;

let lastProductsFetchTime = 0;
let lastCategoriesFetchTime = 0;
let lastBlogsFetchTime = 0;
let lastBlogTopicsFetchTime = 0;

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes in-memory cache to save Firestore reads

// Helper to read file safely
const readFileSafely = (filePath, fallback = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[Cache] Error reading ${filePath}:`, err.message);
  }
  return fallback;
};

// Helper to write file safely
const writeFileSafely = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[Cache] Error writing ${filePath}:`, err.message);
  }
};

// Initialize from disk
const init = () => {
  memoryProducts = readFileSafely(productsFilePath, []);
  memoryCategories = readFileSafely(categoriesFilePath, []);
  memoryBlogs = readFileSafely(blogsFilePath, []);
  memoryBlogTopics = readFileSafely(blogTopicsFilePath, []);
  console.log(`[Cache] Initialized with ${memoryProducts.length} products, ${memoryCategories.length} categories, ${memoryBlogs.length} blogs, ${memoryBlogTopics.length} blog topics.`);
};
// Generate live XML sitemap string
const generateSitemapXmlString = () => {
  const prods = memoryProducts || [];
  const blgs = memoryBlogs || [];
  const baseUrl = 'https://paranimill.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n';

  const staticPages = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/products', priority: '0.9', changefreq: 'daily' },
    { path: '/blogs', priority: '0.8', changefreq: 'daily' },
    { path: '/about', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' }
  ];

  staticPages.forEach(p => {
    xml += '  <url>\n';
    xml += '    <loc>' + baseUrl + p.path + '</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>' + p.changefreq + '</changefreq>\n';
    xml += '    <priority>' + p.priority + '</priority>\n';
    xml += '  </url>\n';
  });

  const cats = memoryCategories || [];
  cats.forEach(c => {
    const catSlug = c.slug || c.id || (c.name ? c.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') : '');
    if (catSlug) {
      xml += '  <url>\n';
      xml += '    <loc>' + baseUrl + '/products?category=' + catSlug + '</loc>\n';
      xml += '    <lastmod>' + today + '</lastmod>\n';
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.85</priority>\n';
      xml += '  </url>\n';
    }
  });

  prods.forEach(prod => {
    const slug = prod.slug || prod.id || prod._id;
    const catSlug = prod.category ? prod.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    const prodPath = catSlug ? ('/product/' + catSlug + '/' + slug) : ('/product/' + slug);
    const modDate = prod.updatedAt ? prod.updatedAt.split('T')[0] : today;
    xml += '  <url>\n';
    xml += '    <loc>' + baseUrl + prodPath + '</loc>\n';
    xml += '    <lastmod>' + modDate + '</lastmod>\n';
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  blgs.forEach(blog => {
    const idOrSlug = blog.id || blog._id || blog.slug;
    const modDate = blog.updatedAt ? blog.updatedAt.split('T')[0] : today;
    xml += '  <url>\n';
    xml += '    <loc>' + baseUrl + '/blog/' + idOrSlug + '</loc>\n';
    xml += '    <lastmod>' + modDate + '</lastmod>\n';
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
};

// Auto-regenerate sitemap.xml on disk if directory exists (local dev)
const regenerateSitemapXml = () => {
  try {
    const xml = generateSitemapXmlString();
    const sitemapDest = 'D:/Paranimill/public/sitemap.xml';
    if (fs.existsSync(path.dirname(sitemapDest))) {
      fs.writeFileSync(sitemapDest, xml, 'utf8');
    }
    const robotsDest = 'D:/Paranimill/public/robots.txt';
    if (fs.existsSync(path.dirname(robotsDest)) && !fs.existsSync(robotsDest)) {
      const robotsTxt = 'User-agent: *\nAllow: /\n\n# Sitemap Index\nSitemap: https://paranimill.com/sitemap.xml\n';
      fs.writeFileSync(robotsDest, robotsTxt, 'utf8');
    }
  } catch (err) {
    // Non-critical background task
  }
};

init();

module.exports = {
  // Products
  isProductsCacheFresh: () => {
    return memoryProducts && memoryProducts.length > 0 && (Date.now() - lastProductsFetchTime < CACHE_TTL_MS);
  },
  getProducts: () => {
    if (!memoryProducts || memoryProducts.length === 0) {
      memoryProducts = readFileSafely(productsFilePath, []);
    }
    return memoryProducts || [];
  },
  setProducts: (products) => {
    if (Array.isArray(products) && products.length > 0) {
      memoryProducts = products;
      lastProductsFetchTime = Date.now();
      writeFileSafely(productsFilePath, products);
      regenerateSitemapXml();
    }
  },

  // Categories (FOR PRODUCTS ONLY)
  isCategoriesCacheFresh: () => {
    return memoryCategories && memoryCategories.length > 0 && (Date.now() - lastCategoriesFetchTime < CACHE_TTL_MS);
  },
  getCategories: () => {
    if (!memoryCategories || memoryCategories.length === 0) {
      memoryCategories = readFileSafely(categoriesFilePath, []);
    }
    return memoryCategories || [];
  },
  setCategories: (categories) => {
    if (Array.isArray(categories) && categories.length > 0) {
      memoryCategories = categories;
      lastCategoriesFetchTime = Date.now();
      writeFileSafely(categoriesFilePath, categories);
      regenerateSitemapXml();
    }
  },

  // Blogs
  isBlogsCacheFresh: () => {
    return memoryBlogs && memoryBlogs.length > 0 && (Date.now() - lastBlogsFetchTime < CACHE_TTL_MS);
  },
  getBlogs: () => {
    if (!memoryBlogs || memoryBlogs.length === 0) {
      memoryBlogs = readFileSafely(blogsFilePath, []);
    }
    return memoryBlogs || [];
  },
  setBlogs: (blogs) => {
    if (Array.isArray(blogs) && blogs.length > 0) {
      memoryBlogs = blogs;
      lastBlogsFetchTime = Date.now();
      writeFileSafely(blogsFilePath, blogs);
      regenerateSitemapXml();
    }
  },

  // Blog Topics (FOR BLOGS ONLY - COMPLETELY ISOLATED FROM PRODUCT CATEGORIES)
  isBlogTopicsCacheFresh: () => {
    return memoryBlogTopics && memoryBlogTopics.length > 0 && (Date.now() - lastBlogTopicsFetchTime < CACHE_TTL_MS);
  },
  getBlogTopics: () => {
    if (!memoryBlogTopics || memoryBlogTopics.length === 0) {
      memoryBlogTopics = readFileSafely(blogTopicsFilePath, []);
    }
    return memoryBlogTopics || [];
  },
  getSitemapXmlString: () => {
    return generateSitemapXmlString();
  },
  setBlogTopics: (topics) => {
    if (Array.isArray(topics) && topics.length > 0) {
      memoryBlogTopics = topics;
      lastBlogTopicsFetchTime = Date.now();
      writeFileSafely(blogTopicsFilePath, topics);
    }
  },
};
