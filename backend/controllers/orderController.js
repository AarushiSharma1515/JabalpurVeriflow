const Order = require('../models/Order');
const Project = require('../models/Project');
const User = require('../models/User');

/**
 * Create a new purchase order (Buyer only)
 */
exports.createOrder = async (req, res) => {
  try {
    const { projectId, sellerId, carbonKg, carbonTons, priceMatic, priceUSD } = req.body;
    const buyerId = req.user._id;

    // Validate required fields
    if (!projectId || !sellerId || !carbonKg || !carbonTons || !priceMatic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: projectId, sellerId, carbonKg, carbonTons, priceMatic' 
      });
    }

    // Get buyer to check wallet address
    const buyer = await User.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if buyer has wallet address
    if (!buyer.walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please add your wallet address before purchasing. Go to Profile to add wallet.' 
      });
    }

    // Get project details
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Verify project is verified
    if (project.status !== 'verified') {
      return res.status(400).json({ 
        success: false, 
        message: 'This project is not yet verified for carbon credits' 
      });
    }

    // Create order
    const order = new Order({
      buyer: buyerId,
      buyerWalletAddress: buyer.walletAddress,
      seller: sellerId,
      project: {
        projectId: projectId,
        title: project.title,
        location: project.location || '',
        carbonKg: carbonKg,
        carbonTons: carbonTons
      },
      amount: {
        carbonKg: carbonKg,
        carbonTons: carbonTons,
        priceMatic: priceMatic,
        priceUSD: priceUSD || carbonTons * 25 // Default $25 per ton if not provided
      },
      status: 'pending'
    });

    await order.save();

    // Populate buyer and seller info for response
    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name email role walletAddress')
      .populate('seller', 'name email')
      .populate('project.projectId', 'title location');

    res.status(201).json({
      success: true,
      message: 'Order created successfully! Admin will process the token transfer to your wallet.',
      order: populatedOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create order', 
      error: error.message 
    });
  }
};

/**
 * Get buyer's own orders
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('seller', 'name email')
      .populate('project.projectId', 'title location')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
};

/**
 * Get seller's orders (farmers see who bought their credits)
 */
exports.getMySellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user._id })
      .populate('buyer', 'name email walletAddress')
      .populate('project.projectId', 'title location')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
};

/**
 * Get single order details
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('buyer', 'name email walletAddress')
      .populate('seller', 'name email')
      .populate('project.projectId', 'title location');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if user is authorized (buyer, seller, or admin)
    const isAuthorized = 
      order.buyer._id.toString() === req.user._id.toString() ||
      order.seller._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to view this order' 
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch order' 
    });
  }
};

/**
 * Update buyer's wallet address (supports Ethereum and Solana)
 */
exports.updateWalletAddress = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address required' 
      });
    }

    const cleanedAddress = walletAddress.trim();
    
    // Ethereum address validation: 0x + 40 hex characters
    const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/i.test(cleanedAddress);
    
    // Solana address validation: Base58 format (no 0, O, I, l characters), 32-44 chars
    const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(cleanedAddress);
    const isValidLength = cleanedAddress.length >= 32 && cleanedAddress.length <= 44;
    const isSolanaAddress = isBase58 && isValidLength;
    
    if (!isEthereumAddress && !isSolanaAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid wallet address format',
        details: 'Accepted formats: Ethereum (0x + 40 hex chars) or Solana Base58 (32-44 chars)',
        received: {
          address: cleanedAddress,
          length: cleanedAddress.length,
          matchesEthereum: isEthereumAddress,
          matchesSolana: isSolanaAddress
        }
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { walletAddress: cleanedAddress },
      { new: true, runValidators: true }
    ).select('-password');

    const addressType = isEthereumAddress ? 'Ethereum' : 'Solana';
    res.status(200).json({
      success: true,
      message: `${addressType} wallet address saved successfully`,
      user
    });
  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save wallet address',
      error: error.message 
    });
  }
};
// ============= ADMIN ONLY CONTROLLERS =============

/**
 * Admin: Get all orders
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .populate('buyer', 'name email walletAddress')
      .populate('seller', 'name email')
      .populate('project.projectId', 'title location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(query);
    
    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
};

/**
 * Admin: Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, transactionHash, adminNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status required' 
      });
    }
    
    const validStatuses = ['pending', 'approved', 'completed', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Update fields
    order.status = status;
    if (transactionHash) order.transactionHash = transactionHash;
    if (adminNotes) order.adminNotes = adminNotes;
    
    await order.save();
    
    // Get populated order for response
    const updatedOrder = await Order.findById(orderId)
      .populate('buyer', 'name email walletAddress')
      .populate('seller', 'name email');
    
    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status' 
    });
  }
};

/**
 * Admin: Get order statistics
 */
exports.getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalMatic: { $sum: '$amount.priceMatic' },
          totalCarbonTons: { $sum: '$amount.carbonTons' }
        }
      }
    ]);
    
    const totalOrders = await Order.countDocuments();
    const totalValue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$amount.priceMatic' } } }
    ]);
    
    res.status(200).json({
      success: true,
      stats,
      totalOrders,
      totalValueMatic: totalValue[0]?.total || 0
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
};