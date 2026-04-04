const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// Buyer routes (marketplace users)
router.post('/create', authMiddleware, orderController.createOrder);
router.get('/my-orders', authMiddleware, orderController.getMyOrders);
router.get('/my-seller-orders', authMiddleware, orderController.getMySellerOrders);
router.get('/:orderId', authMiddleware, orderController.getOrderById);
router.patch('/update-wallet', authMiddleware, orderController.updateWalletAddress);
// Backward compatibility: some clients send POST instead of PATCH
router.post('/update-wallet', authMiddleware, orderController.updateWalletAddress);

// Admin routes
router.get('/admin/all', authMiddleware, orderController.getAllOrders);
router.patch('/admin/:orderId/status', authMiddleware, orderController.updateOrderStatus);
router.get('/admin/stats/overview', authMiddleware, orderController.getOrderStats);

module.exports = router;