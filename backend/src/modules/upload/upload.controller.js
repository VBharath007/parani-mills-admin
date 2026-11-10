const cloudinary = require('../../config/cloudinary');

/**
 * Helper to upload buffer to Cloudinary using stream
 */
const uploadFromBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'parani_mill_stores',
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Upload single image to Cloudinary
 * Supports both multipart/form-data (req.file) and JSON base64/URL (req.body.image)
 */
const uploadImage = async (req, res, next) => {
  try {
    const folder = req.body.folder || req.query.folder || 'parani_mill_stores';
    let result;

    if (req.file) {
      result = await uploadFromBuffer(req.file.buffer, { folder });
    } else if (req.body.image) {
      result = await cloudinary.uploader.upload(req.body.image, {
        folder,
        resource_type: 'auto',
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image file or image data provided',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to Cloudinary',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image upload failed',
    });
  }
};

/**
 * Delete an image from Cloudinary by public_id
 */
const deleteImage = async (req, res, next) => {
  try {
    const publicId = req.params.publicId || req.body.public_id || req.query.public_id;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'public_id is required to delete an image',
      });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    return res.status(200).json({
      success: true,
      message: 'Image deleted from Cloudinary',
      data: result,
    });
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image deletion failed',
    });
  }
};

/**
 * Upload multiple images to Cloudinary (multipart/form-data with 'images')
 */
const uploadMultipleImages = async (req, res, next) => {
  try {
    const folder = req.body.folder || req.query.folder || 'parani_mill_stores';
    const files = req.files || [];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    const uploadPromises = files.map((file) =>
      uploadFromBuffer(file.buffer, { folder })
    );

    const results = await Promise.all(uploadPromises);

    return res.status(200).json({
      success: true,
      message: `${results.length} images uploaded successfully to Cloudinary`,
      data: results.map((result) => ({
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      })),
    });
  } catch (error) {
    console.error('Cloudinary Multiple Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Multiple images upload failed',
    });
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
};
