// const express = require('express');
// const router = express.Router();
// const mlController = require('../controllers/MLController');
// const authMiddleware = require('../middleware/authMiddleware');

// router.post('/save-result', authMiddleware ,mlController.saveMLResult);
// // All routes require authentication
// router.use(authMiddleware);
// // ========== PUBLIC (Authenticated Users) ==========
// // Save ML results from Python script (called by Verification screen)
// // Get pending count (for dashboard badges - both admin and farmers can see their own)
// router.get('/pending-count', mlController.getPendingCount);

// // Get single ML result by ID
// router.get('/result/:id', mlController.getMLResultById);

// // ========== ADMIN ONLY ROUTES ==========

// // Get all ML results with filters (admin only)
// router.get('/results', mlController.getMLResults);

// // Get ML statistics for dashboard (admin only)
// router.get('/stats', mlController.getMLStats);

// // Approve ML result (admin only)
// router.patch('/:id/approve', mlController.approveMLResult);

// // Reject ML result (admin only)
// router.patch('/:id/reject', mlController.rejectMLResult);

// // Mark as minted after credits created (admin only)
// router.patch('/:id/mark-minted', mlController.markAsMinted);

// module.exports = router;


const express = require('express');
const router = express.Router();
const mlController = require('../controllers/MLController');
const authMiddleware = require('../middleware/authMiddleware');
const verifierMiddleware = require('../middleware/verifierMiddleware');

// Debug middleware - log all requests
router.use((req, res, next) => {
  console.log(`[ML Routes] ${req.method} ${req.path}`);
  console.log(`[ML Routes] Headers:`, req.headers.authorization ? 'Has Auth' : 'No Auth');
  next();
});

// Apply auth
router.use(authMiddleware);

// Debug after auth
router.use((req, res, next) => {
  console.log(`[ML Routes] After auth - User:`, req.user?.email, 'Role:', req.user?.role);
  next();
});

// Routes
router.post('/save-result', mlController.saveMLResult);

router.get('/pending-count', mlController.getPendingCount);
router.get('/result/:id', mlController.getMLResultById);
router.get('/results', mlController.getMLResults);
router.get('/stats', mlController.getMLStats);
router.patch('/:id/approve', verifierMiddleware, mlController.approveMLResult);
router.patch('/:id/reject', verifierMiddleware, mlController.rejectMLResult);
router.patch('/:id/mark-minted', verifierMiddleware, mlController.markAsMinted);
// Appeal routes (farmer)
router.post('/:id/appeal', mlController.fileAppeal);

// Appeal review (admin and farmers)
router.patch('/:id/appeal/review', verifierMiddleware, mlController.reviewAppeal);
module.exports = router;