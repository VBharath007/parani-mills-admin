const express = require('express');
const router = express.Router();
const productController = require('./product.controller');
const { protect } = require('../../middleware/auth.middleware');

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin protected routes
router.post('/', protect, productController.createProduct);
router.put('/:id', protect, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;
