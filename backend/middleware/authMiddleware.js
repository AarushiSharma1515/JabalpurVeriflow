const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];

  // Handle internal ML service token
  if (token === process.env.ML_INTERNAL_TOKEN || token === 'veriflow_ml_secret') {
    req.user = {
      id: 'ml-service',
      email: 'ml@veriflow.com',
      role: 'service',
      name: 'ML Service'
    };
    return next();
  }

  // Handle mock admin token (for hardcoded admin login)
  if (token === 'admin-mock-token') {
    req.user = {
      id: 'admin',
      email: 'admin@veriflow.com',
      role: 'admin',
      name: 'Admin'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    console.error('auth middleware error', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
