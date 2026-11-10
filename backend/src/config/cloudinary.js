const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbvns9uwy',
  api_key: process.env.CLOUDINARY_API_KEY || '437164393589872',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'rsi365MlsTqgwFJbt8QrGuQrOE8',
  secure: true,
});

module.exports = cloudinary;
