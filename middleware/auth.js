const jwt = require('jsonwebtoken');

module.exports = {
  // Middleware to check if user is authenticated
  isAuth: (req, res, next) => {
    // Check if user is authenticated via session
    if (req.isAuthenticated()) {
      return next();
    }

    // Check if user is authenticated via JWT
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.user;
      next();
    } catch (err) {
      res.status(401).json({ message: 'Token is not valid' });
    }
  },

  // Middleware to check if user is seller
  isSeller: (req, res, next) => {
    if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Not authorized as seller' });
    }
  },

  // Middleware to check if user is admin
  isAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Not authorized as admin' });
    }
  },
};