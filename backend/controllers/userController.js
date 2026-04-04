const User = require('../models/User');

// ======================================================
// GET MY PROFILE
// ======================================================
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE MY PROFILE
// ======================================================
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { name, email, phone, walletAddress } = req.body;

    const updates = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();
    if (typeof walletAddress === 'string') updates.walletAddress = walletAddress.trim();

    if (typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
      updates.email = normalizedEmail;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL MARKETPLACE USERS
// ======================================================
exports.getMarketplaceUsers = async (req, res) => {
  try {
    // Fetch only users with role 'marketplaceuser'
    const users = await User.find({ role: 'marketplaceuser' })
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching marketplace users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace users',
      error: error.message
    });
  }
};

// ======================================================
// GET ALL FARMERS (FIELD OPERATORS)
// ======================================================
exports.getFarmers = async (req, res) => {
  try {
    // Fetch only users with role 'farmer'
    const users = await User.find({ role: 'farmer' })
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      success: true,
      count: users.length,
      farmers: users
    });
  } catch (error) {
    console.error('Error fetching farmers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch farmers',
      error: error.message
    });
  }
};

// ======================================================
// DELETE USER BY ID
// ======================================================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// ======================================================
// UPDATE USER STATUS (Approve/Reject Farmer)
// ======================================================
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// ======================================================
// UPDATE MARKETPLACE USER VERIFICATION
// ======================================================
exports.updateUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    // Validate verification status
    if (!['unverified', 'verified'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status. Must be unverified or verified'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { verificationStatus },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `User verification updated successfully`,
      user
    });
  } catch (error) {
    console.error('Error updating user verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user verification',
      error: error.message
    });
  }
};