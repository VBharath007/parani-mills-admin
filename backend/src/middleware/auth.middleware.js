const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Protects admin routes by verifying JWT Bearer token
 */
const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token is invalid or expired',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }
};

module.exports = { protect };
