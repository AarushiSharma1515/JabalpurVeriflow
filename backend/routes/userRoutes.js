const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Protected routes - any authenticated user
router.get('/me', authMiddleware, userController.getMyProfile);
router.patch('/me', authMiddleware, userController.updateMyProfile);

// Protected routes - require authentication and admin role
router.get('/marketplace-users', authMiddleware, adminMiddleware, userController.getMarketplaceUsers);
router.get('/farmers', authMiddleware, adminMiddleware, userController.getFarmers);
router.patch('/:id/status', authMiddleware, adminMiddleware, userController.updateUserStatus);
router.patch('/:id/verification', authMiddleware, adminMiddleware, userController.updateUserVerification);
router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUser);

module.exports = router;