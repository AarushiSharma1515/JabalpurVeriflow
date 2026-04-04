const verifierMiddleware = (req, res, next) => {
  // Allow both admin and farmer roles to verify/reject projects
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'farmer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only admin and field operators can verify/reject projects.'
    });
  }

  next();
};

module.exports = verifierMiddleware;
