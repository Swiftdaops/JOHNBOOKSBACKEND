const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  // Prefer cookie-based token, fall back to Authorization header (Bearer) for clients
  // that can't store third-party cookies (mobile browsers or strict privacy settings).
  let token = (req.cookies && req.cookies.jwt) || null;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid');
  }
});

const admin = (req, res, next) => {
  if (req.user) return next();
  res.status(403);
  throw new Error('Not authorized as an admin');
};

module.exports = { protect, admin };
