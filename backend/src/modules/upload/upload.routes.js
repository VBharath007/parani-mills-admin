const express = require('express');
const multer = require('multer');
const { uploadImage, uploadMultipleImages, deleteImage } = require('./upload.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Configure multer for memory storage (file buffer passed directly to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed!'), false);
    }
  },
});

// Upload single image (accepts multipart 'image' or 'file', or JSON body)
router.post('/', upload.single('image'), uploadImage);

// Upload multiple images (accepts multipart 'images')
router.post('/multiple', upload.array('images', 20), uploadMultipleImages);

// Delete image by public ID
router.delete('/:publicId(*)', deleteImage);
router.delete('/', deleteImage);

module.exports = router;
