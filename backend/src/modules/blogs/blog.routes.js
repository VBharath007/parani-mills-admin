const express = require('express');
const router = express.Router();
const blogController = require('./blog.controller');
const { protect } = require('../../middleware/auth.middleware');

// Blog Topics routes (Completely isolated from store product categories!)
router.get('/topics', blogController.getBlogTopics);
router.post('/topics', protect, blogController.createBlogTopic);
router.put('/topics/:id', protect, blogController.updateBlogTopic);
router.delete('/topics/:id', protect, blogController.deleteBlogTopic);

// Public blog routes
router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlogById);

// Admin protected blog routes
router.post('/', protect, blogController.createBlog);
router.put('/:id', protect, blogController.updateBlog);
router.delete('/:id', protect, blogController.deleteBlog);

module.exports = router;
