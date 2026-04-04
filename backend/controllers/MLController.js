const MLResult = require('../models/MLResults');
const Project = require('../models/Project');
const User = require('../models/User');

/**
 * Save ML analysis results from Python model
 * Called by: Verification screen after running ML
 */
exports.saveMLResult = async (req, res) => {
  try {
    const {
      projectId,
      // ML Output fields (actual field names from ML service)
      mean_height_m,
      mean_rh_atl08_m,
      mean_agb_Mg_per_ha,
      bgb_Mg_per_ha,
      total_biomass_Mg_per_ha,
      carbon_Mg_per_ha,
      co2_t_per_ha,
      mean_pred_confidence,  // This is sent instead of model_r2_mean
      n_points,  // This is sent instead of n_samples
      model_type,
      // Optional fields
      modelVersion,
      processingTimeMs
    } = req.body;

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'projectId is required'
      });
    }

    if (!co2_t_per_ha) {
      return res.status(400).json({
        success: false,
        message: 'co2_t_per_ha is required from ML model'
      });
    }

    // Get project details
    const project = await Project.findById(projectId).populate('owner', 'name email');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get farmer details
    const farmer = await User.findById(project.owner._id);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    // Calculate total CO2 for entire project
    const areaHectares = project.areaHectares || 0;
    const totalCo2Tons = co2_t_per_ha * areaHectares;
    const totalCarbonTons = (carbon_Mg_per_ha || 0) * areaHectares;

    // Check if ML result already exists for this project
    let mlResult = await MLResult.findOne({ 
      projectId: projectId,
      status: { $ne: 'rejected' }
    });

    if (mlResult) {
      // Update existing result
      mlResult.meanHeightM = mean_height_m || mlResult.meanHeightM;
      mlResult.meanRhAtl08M = mean_rh_atl08_m || mlResult.meanRhAtl08M;
      mlResult.meanAgbMgPerHa = mean_agb_Mg_per_ha || mlResult.meanAgbMgPerHa;
      mlResult.bgbMgPerHa = bgb_Mg_per_ha || mlResult.bgbMgPerHa;
      mlResult.totalBiomassMgPerHa = total_biomass_Mg_per_ha || mlResult.totalBiomassMgPerHa;
      mlResult.carbonMgPerHa = carbon_Mg_per_ha || mlResult.carbonMgPerHa;
      mlResult.co2TPerHa = co2_t_per_ha;
      mlResult.modelR2Mean = mean_pred_confidence || mlResult.modelR2Mean;  // Using confidence as R² approximation
      mlResult.modelR2Std = model_r2_std || mlResult.modelR2Std;
      mlResult.modelRmseMean = model_rmse_mean || mlResult.modelRmseMean;
      mlResult.nSamples = n_points || mlResult.nSamples;
      mlResult.totalCo2Tons = totalCo2Tons;
      mlResult.totalCarbonTons = totalCarbonTons;
      mlResult.modelVersion = modelVersion || mlResult.modelVersion;
      mlResult.processingTimeMs = processingTimeMs || mlResult.processingTimeMs;
      mlResult.status = 'pending'; // Reset to pending for review
      mlResult.analysisDate = new Date();
      
      await mlResult.save();
      
      return res.status(200).json({
        success: true,
        message: 'ML results updated successfully',
        result: mlResult
      });
    }

    // Create new ML result
    mlResult = new MLResult({
      projectId: projectId,
      projectTitle: project.title,
      areaHectares: areaHectares,
      farmerId: project.owner._id,
      farmerName: farmer.name,
      // ML outputs
      meanHeightM: mean_height_m || null,
      meanRhAtl08M: mean_rh_atl08_m || null,
      meanAgbMgPerHa: mean_agb_Mg_per_ha || null,
      bgbMgPerHa: bgb_Mg_per_ha || null,
      totalBiomassMgPerHa: total_biomass_Mg_per_ha || null,
      carbonMgPerHa: carbon_Mg_per_ha || null,
      co2TPerHa: co2_t_per_ha,
      modelR2Mean: mean_pred_confidence || null,  // Using confidence as R² approximation
      modelR2Std: null,  // Not provided by ML service
      modelRmseMean: null,  // Not provided by ML service
      nSamples: n_points || null,
      // Derived values
      totalCo2Tons: totalCo2Tons,
      totalCarbonTons: totalCarbonTons,
      // Metadata
      modelVersion: modelVersion || 'v1.0',
      processingTimeMs: processingTimeMs || null,
      status: 'pending'
    });

    await mlResult.save();

    res.status(201).json({
      success: true,
      message: 'ML results saved successfully. Awaiting admin review.',
      result: mlResult
    });

  } catch (error) {
    console.error('Save ML result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save ML results',
      error: error.message
    });
  }
};

/**
 * Get all ML results with filters (Admin only)
 */
exports.getMLResults = async (req, res) => {
  try {
    const { status, projectId, farmerId, limit = 50, page = 1 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (projectId) query.projectId = projectId;
    if (farmerId) query.farmerId = farmerId;
    
    const skip = (page - 1) * limit;
    
    const results = await MLResult.find(query)
      .populate('projectId', 'title location areaHectares status')
      .populate('farmerId', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await MLResult.countDocuments(query);
    
    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      results
    });
  } catch (error) {
    console.error('Get ML results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ML results'
    });
  }
};

/**
 * Get single ML result by ID
 */
exports.getMLResultById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await MLResult.findById(id)
      .populate('projectId', 'title location areaHectares status description')
      .populate('farmerId', 'name email phone')
      .populate('reviewedBy', 'name email');
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'ML result not found'
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Get ML result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ML result'
    });
  }
};

/**
 * Get pending ML results count (for admin dashboard badge)
 */
exports.getPendingCount = async (req, res) => {
  try {
    const count = await MLResult.countDocuments({ status: 'pending' });
    
    res.status(200).json({
      success: true,
      pendingCount: count
    });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending count'
    });
  }
};

/**
 * Admin: Approve ML result
 * When approved, project status is updated to 'verified'
 */
exports.approveMLResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    const mlResult = await MLResult.findById(id);
    if (!mlResult) {
      return res.status(404).json({
        success: false,
        message: 'ML result not found'
      });
    }
    
    if (mlResult.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve: Result is already ${mlResult.status}`
      });
    }
    
    // Update ML result status
    mlResult.status = 'approved';
    mlResult.reviewedBy = req.user._id;
    mlResult.reviewedAt = new Date();
    mlResult.adminNotes = adminNotes || '';
    
    await mlResult.save();
    
    // Update project status to verified
    await Project.findByIdAndUpdate(mlResult.projectId, {
      status: 'verified',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      verifiedBy: req.user._id
    });
    
    res.status(200).json({
      success: true,
      message: 'ML result approved successfully. Project is now verified.',
      result: mlResult
    });
  } catch (error) {
    console.error('Approve ML result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve ML result'
    });
  }
};

/**
 * Admin: Reject ML result
 */
exports.rejectMLResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    if (!adminNotes) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason (adminNotes) is required'
      });
    }
    
    const mlResult = await MLResult.findById(id);
    if (!mlResult) {
      return res.status(404).json({
        success: false,
        message: 'ML result not found'
      });
    }
    
    if (mlResult.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject: Result is already ${mlResult.status}`
      });
    }
    
    mlResult.status = 'rejected';
    mlResult.reviewedBy = req.user._id;
    mlResult.reviewedAt = new Date();
    mlResult.adminNotes = adminNotes;
    
    await mlResult.save();
    
    // Update project status
    await Project.findByIdAndUpdate(mlResult.projectId, {
      status: 'rejected',
      rejectionReason: adminNotes
    });
    
    res.status(200).json({
      success: true,
      message: 'ML result rejected',
      result: mlResult
    });
  } catch (error) {
    console.error('Reject ML result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject ML result'
    });
  }
};

/**
 * Get ML statistics for admin dashboard
 */
exports.getMLStats = async (req, res) => {
  try {
    const totalResults = await MLResult.countDocuments();
    const pendingResults = await MLResult.countDocuments({ status: 'pending' });
    const approvedResults = await MLResult.countDocuments({ status: 'approved' });
    const rejectedResults = await MLResult.countDocuments({ status: 'rejected' });
    const mintedResults = await MLResult.countDocuments({ status: 'minted' });
    
    // Get total CO2 from approved results
    const approvedAgg = await MLResult.aggregate([
      { $match: { status: { $in: ['approved', 'minted'] } } },
      { $group: { _id: null, totalCo2Tons: { $sum: '$totalCo2Tons' } } }
    ]);
    
    const totalCo2Tons = approvedAgg[0]?.totalCo2Tons || 0;
    
    res.status(200).json({
      success: true,
      stats: {
        totalResults,
        pending: pendingResults,
        approved: approvedResults,
        rejected: rejectedResults,
        minted: mintedResults,
        totalCo2Tons: Math.round(totalCo2Tons * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get ML stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

/**
 * Update ML result status to 'minted' (called after credits are minted)
 */
exports.markAsMinted = async (req, res) => {
  try {
    const { id } = req.params;
    const { creditId } = req.body;
    
    const mlResult = await MLResult.findById(id);
    if (!mlResult) {
      return res.status(404).json({
        success: false,
        message: 'ML result not found'
      });
    }
    
    if (mlResult.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as minted: Result status is ${mlResult.status}, expected 'approved'`
      });
    }
    
    mlResult.status = 'minted';
    mlResult.creditId = creditId;
    
    await mlResult.save();
    
    res.status(200).json({
      success: true,
      message: 'ML result marked as minted',
      result: mlResult
    });
  } catch (error) {
    console.error('Mark as minted error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};