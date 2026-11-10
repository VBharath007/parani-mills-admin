const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/products/product.routes');
const blogRoutes = require('./modules/blogs/blog.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const categoryRoutes = require('./modules/categories/category.routes');

// Import middlewares
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Enable CORS
app.use(cors());

// Body parser middlewares
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Root health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Parani Mill Stores Admin API is running smoothly',
  });
});

const https = require('https');

// Pure Tamil TTS Audio Stream Proxy (Zero installation required)
app.get('/api/tts', (req, res) => {
  const text = (req.query.text || '').trim();
  if (!text) {
    return res.status(400).send('Text query parameter required');
  }

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ta&client=tw-ob&q=${encodeURIComponent(text)}`;
  
  const clientReq = https.get(ttsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  }, (ttsRes) => {
    if (ttsRes.statusCode !== 200) {
      return res.status(ttsRes.statusCode || 500).end();
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    ttsRes.pipe(res);
  });

  clientReq.on('error', (err) => {
    console.warn('TTS streaming failed:', err.message);
    res.status(500).end();
  });
});

// Live XML Sitemap & Robots.txt for Search Engines (Google Search Console / Railway)
const cacheService = require('./cache/cache.service');

app.get('/sitemap.xml', (req, res) => {
  try {
    const xml = cacheService.getSitemapXmlString();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(xml);
  } catch (err) {
    return res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send('User-agent: *\nAllow: /\n\n# Sitemap Index\nSitemap: https://paranimill.com/sitemap.xml\n');
});

// Mount modules API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
