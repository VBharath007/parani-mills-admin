const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// Only route in auth module: Admin Login
router.post('/login', authController.login);

module.exports = router;
