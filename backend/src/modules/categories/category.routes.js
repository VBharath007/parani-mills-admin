const express = require('express');
const router = express.Router();
const categoryController = require('./category.controller');

// Public route to get all categories
router.get('/', categoryController.getCategories);

// Manage categories
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
