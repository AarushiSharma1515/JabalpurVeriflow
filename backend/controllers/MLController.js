const MLResult = require('../models/MLResults');
const Project = require('../models/Project');
const User = require('../models/User');
const CarbonCredit = require('../models/CarbonCredit');

// Safely import solana — won't crash if not configured
let mintCarbonCredit = null;
try {
  const solana = require('../blockchain/solanaService');
  mintCarbonCredit = solana.mintCarbonCredit;
} catch (e) {
  console.warn('⚠️ Solana service not available — blockchain minting disabled');
}

// ========== TIER CALCULATION ==========
const calculateTier = (confidence) => {
  const score = parseFloat(confidence) || 0;
  if (score >= 0.65) return { tier: 'HIGH',   label: 'Auto-Mint',     status: 'auto_minted'   };
  if (score >= 0.50) return { tier: 'MEDIUM', label: 'Admin Review',  status: 'admin_review'  };
  if (score >= 0.35) return { tier: 'LOW',    label: 'Manual Review', status: 'manual_review' };
  return               { tier: 'DENIED', label: 'Auto-Denied',   status: 'auto_denied'   };
};

// ========== AUTO MINT (safe — skips if blockchain not ready) ==========
const performAutoMint = async ({ mlResult, project, farmer, co2_t_per_ha, totalCo2Tons }) => {
  if (!mlResult || !project || !farmer) return;
  if (mlResult.creditId) return; // already minted

  // CHANGED: Always create CarbonCredit, whether blockchain succeeds or not
  let mintData = {
    creditsIssued: mlResult.credits || 0,
    mintAddresses: ['pending_blockchain'],
    metadataUri: 'pending_ipfs',
    blockchainNetwork: 'pending',
    blockchainMintedAt: null,
    explorerUrl: null
  };

  // Try blockchain if configured; otherwise use pending data
  if (mintCarbonCredit) {
    try {
      const mintResult = await mintCarbonCredit({
        projectId: project._id.toString(),
        plotName: project.title,
        co2_t_per_ha,
        ecosystem: 'mangrove'
      });

      // CHANGED: Use real blockchain data if successful
      mintData = {
        creditsIssued: mintResult.creditsIssued,
        mintAddresses: mintResult.mintAddresses,
        metadataUri: mintResult.metadataUri,
        blockchainNetwork: 'solana-devnet',
        blockchainMintedAt: new Date(),
        explorerUrl: mintResult.explorerUrl
      };
      console.log('📦 Blockchain mint succeeded, blockchain data will be saved');
    } catch (mintError) {
      console.warn('⚠️ Blockchain mint failed (non-fatal):', mintError.message || mintError);
      console.log('📦 Will save CarbonCredit with pending blockchain status');
    }
  } else {
    console.log('ℹ️ Blockchain not configured — will save CarbonCredit with pending status');
  }

  // CHANGED: Always save CarbonCredit to MongoDB regardless of blockchain status
  try {
    const carbonCredit = new CarbonCredit({
      mlResultId: mlResult._id,
      projectId: project._id,
      projectTitle: project.title,
      farmerId: farmer._id,
      farmerName: farmer.name,
      creditsIssued: mintData.creditsIssued,
      co2TPerHa: co2_t_per_ha,
      carbonKgTotal: (totalCo2Tons || 0) * 1000,
      ecosystem: 'mangrove',
      mintAddresses: mintData.mintAddresses,
      metadataUri: mintData.metadataUri,
      blockchain: {
        network: mintData.blockchainNetwork,
        mintedAt: mintData.blockchainMintedAt,
        explorerUrl: mintData.explorerUrl
      },
      status: 'minted'
    });

    await carbonCredit.save();
    mlResult.creditId = carbonCredit._id;
    await mlResult.save();
    // CHANGED: Always log save, with blockchain status
    console.log('✅ CarbonCredit saved to MongoDB:', carbonCredit._id);
    if (mintData.blockchainNetwork === 'pending') {
      console.log('   (Blockchain status: pending)');
    } else {
      console.log('   (Blockchain minted:', mintData.explorerUrl, ')');
    }
  } catch (saveError) {
    console.error('❌ Failed to save CarbonCredit:', saveError.message || saveError);
  }
};

// ========== SAVE ML RESULT ==========
exports.saveMLResult = async (req, res) => {
  try {
    const {
      projectId,
      mean_height_m,
      mean_rh_atl08_m,
      mean_agb_Mg_per_ha,
      bgb_Mg_per_ha,
      total_biomass_Mg_per_ha,
      carbon_Mg_per_ha,
      co2_t_per_ha,
      mean_pred_confidence,
      n_points,
      model_type,
      model_r2_std,
      model_rmse_mean,
      modelVersion,
      processingTimeMs
    } = req.body;

    if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });
    if (!co2_t_per_ha) return res.status(400).json({ success: false, message: 'co2_t_per_ha is required' });

    const project = await Project.findById(projectId).populate('owner', 'name email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const farmer = await User.findById(project.owner._id);
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });

    const areaHectares = project.areaHectares || 0;
    const totalCo2Tons = co2_t_per_ha * areaHectares;
    const totalCarbonTons = (carbon_Mg_per_ha || 0) * areaHectares;

    const confidence = mean_pred_confidence || 0;
    const { tier, label, status: tierStatus } = calculateTier(confidence);
    const credits = Math.floor(co2_t_per_ha || 0);

    let mlResult = await MLResult.findOne({
      projectId,
      status: { $nin: ['rejected', 'appeal_rejected'] }
    });

    if (mlResult) {
      // UPDATE existing
      mlResult.meanHeightM         = mean_height_m || mlResult.meanHeightM;
      mlResult.meanRhAtl08M        = mean_rh_atl08_m || mlResult.meanRhAtl08M;
      mlResult.meanAgbMgPerHa      = mean_agb_Mg_per_ha || mlResult.meanAgbMgPerHa;
      mlResult.bgbMgPerHa          = bgb_Mg_per_ha || mlResult.bgbMgPerHa;
      mlResult.totalBiomassMgPerHa = total_biomass_Mg_per_ha || mlResult.totalBiomassMgPerHa;
      mlResult.carbonMgPerHa       = carbon_Mg_per_ha || mlResult.carbonMgPerHa;
      mlResult.co2TPerHa           = co2_t_per_ha;
      mlResult.modelR2Mean         = mean_pred_confidence || mlResult.modelR2Mean;
      mlResult.modelR2Std          = model_r2_std || mlResult.modelR2Std;
      mlResult.modelRmseMean       = model_rmse_mean || mlResult.modelRmseMean;
      mlResult.nSamples            = n_points || mlResult.nSamples;
      mlResult.totalCo2Tons        = totalCo2Tons;
      mlResult.totalCarbonTons     = totalCarbonTons;
      mlResult.modelVersion        = modelVersion || mlResult.modelVersion;
      mlResult.processingTimeMs    = processingTimeMs || mlResult.processingTimeMs;
      mlResult.analysisDate        = new Date();
      mlResult.tier                = tier;
      mlResult.tierLabel           = label;
      mlResult.confidenceScore     = confidence;
      mlResult.credits             = credits;
      mlResult.status              = tierStatus;

      if (tierStatus === 'auto_denied') {
        mlResult.appealDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      if (tierStatus === 'auto_minted') {
        mlResult.autoMintedAt = new Date();
        await Project.findByIdAndUpdate(projectId, { status: 'verified' });
      }

      await mlResult.save();

      if (tierStatus === 'auto_minted') {
        await performAutoMint({ mlResult, project, farmer, co2_t_per_ha, totalCo2Tons });
      }

      return res.status(200).json({
        success: true,
        message: 'ML results updated and re-routed.',
        tier, tierLabel: label, status: tierStatus, credits,
        result: mlResult
      });
    }

    // CREATE new
    mlResult = new MLResult({
      projectId,
      projectTitle:        project.title,
      areaHectares,
      farmerId:            project.owner._id,
      farmerName:          farmer.name,
      meanHeightM:         mean_height_m || null,
      meanRhAtl08M:        mean_rh_atl08_m || null,
      meanAgbMgPerHa:      mean_agb_Mg_per_ha || null,
      bgbMgPerHa:          bgb_Mg_per_ha || null,
      totalBiomassMgPerHa: total_biomass_Mg_per_ha || null,
      carbonMgPerHa:       carbon_Mg_per_ha || null,
      co2TPerHa:           co2_t_per_ha,
      modelR2Mean:         mean_pred_confidence || null,
      modelR2Std:          model_r2_std || null,
      modelRmseMean:       model_rmse_mean || null,
      nSamples:            n_points || null,
      totalCo2Tons,
      totalCarbonTons,
      modelVersion:        modelVersion || 'v1.0',
      processingTimeMs:    processingTimeMs || null,
      tier,
      tierLabel:           label,
      confidenceScore:     confidence,
      credits,
      status:              tierStatus,
    });

    if (tierStatus === 'auto_denied') {
      mlResult.appealDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    if (tierStatus === 'auto_minted') {
      mlResult.autoMintedAt = new Date();
      await Project.findByIdAndUpdate(projectId, { status: 'verified' });
    }

    await mlResult.save();

    if (tierStatus === 'auto_minted') {
      await performAutoMint({ mlResult, project, farmer, co2_t_per_ha, totalCo2Tons });
    }

    const messages = {
      'auto_minted':   'High confidence! Credits auto-minted to marketplace.',
      'admin_review':  'Submitted for admin review.',
      'manual_review': 'Requires manual review with notes.',
      'auto_denied':   'Confidence too low. Denied. Farmer can appeal within 30 days.'
    };

    res.status(201).json({
      success: true,
      message: messages[tierStatus] || 'Saved.',
      tier, tierLabel: label, status: tierStatus, credits,
      result: mlResult
    });

  } catch (error) {
    console.error('Save ML result error:', error);
    res.status(500).json({ success: false, message: 'Failed to save ML results', error: error.message });
  }
};

// ========== GET ALL RESULTS ==========
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
    res.status(200).json({ success: true, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ML results' });
  }
};

// ========== GET SINGLE RESULT ==========
exports.getMLResultById = async (req, res) => {
  try {
    const result = await MLResult.findById(req.params.id)
      .populate('projectId', 'title location areaHectares status description')
      .populate('farmerId', 'name email phone')
      .populate('reviewedBy', 'name email');
    if (!result) return res.status(404).json({ success: false, message: 'ML result not found' });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ML result' });
  }
};

// ========== PENDING COUNT ==========
exports.getPendingCount = async (req, res) => {
  try {
    const count = await MLResult.countDocuments({
      status: { $in: ['admin_review', 'manual_review', 'appealed', 'pending'] }
    });
    res.status(200).json({ success: true, pendingCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get pending count' });
  }
};

// ========== APPROVE ==========
exports.approveMLResult = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const mlResult = await MLResult.findById(req.params.id);
    if (!mlResult) return res.status(404).json({ success: false, message: 'ML result not found' });

    if (!['admin_review', 'manual_review', 'pending'].includes(mlResult.status)) {
      return res.status(400).json({ success: false, message: `Cannot approve: status is ${mlResult.status}` });
    }
    if (mlResult.status === 'manual_review' && !adminNotes?.trim()) {
      return res.status(400).json({ success: false, message: 'Manual review requires admin notes' });
    }

    mlResult.status = 'auto_minted';
    mlResult.autoMintedAt = new Date();
    mlResult.reviewedBy = req.user._id;
    mlResult.reviewedAt = new Date();
    mlResult.adminNotes = adminNotes || '';
    await mlResult.save();

    await Project.findByIdAndUpdate(mlResult.projectId, {
      status: 'verified',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      verifiedBy: req.user._id
    });

    res.status(200).json({ success: true, message: 'Approved. Credits minted to marketplace.', result: mlResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== REJECT ==========
exports.rejectMLResult = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    if (!adminNotes) return res.status(400).json({ success: false, message: 'Rejection reason required' });

    const mlResult = await MLResult.findById(req.params.id);
    if (!mlResult) return res.status(404).json({ success: false, message: 'ML result not found' });

    if (!['admin_review', 'manual_review', 'pending'].includes(mlResult.status)) {
      return res.status(400).json({ success: false, message: `Cannot reject: status is ${mlResult.status}` });
    }

    mlResult.status = 'rejected';
    mlResult.reviewedBy = req.user._id;
    mlResult.reviewedAt = new Date();
    mlResult.adminNotes = adminNotes;
    await mlResult.save();

    await Project.findByIdAndUpdate(mlResult.projectId, { status: 'rejected', rejectionReason: adminNotes });
    res.status(200).json({ success: true, message: 'ML result rejected', result: mlResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STATS ==========
exports.getMLStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected, minted, autoMinted] = await Promise.all([
      MLResult.countDocuments(),
      MLResult.countDocuments({ status: { $in: ['admin_review', 'manual_review', 'pending'] } }),
      MLResult.countDocuments({ status: 'approved' }),
      MLResult.countDocuments({ status: { $in: ['rejected', 'auto_denied', 'appeal_rejected'] } }),
      MLResult.countDocuments({ status: 'minted' }),
      MLResult.countDocuments({ status: 'auto_minted' }),
    ]);

    const agg = await MLResult.aggregate([
      { $match: { status: { $in: ['auto_minted', 'minted', 'approved'] } } },
      { $group: { _id: null, totalCo2Tons: { $sum: '$totalCo2Tons' } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total, pending, approved, rejected, minted, autoMinted,
        totalCo2Tons: Math.round((agg[0]?.totalCo2Tons || 0) * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

// ========== MARK MINTED ==========
exports.markAsMinted = async (req, res) => {
  try {
    const { creditId } = req.body;
    const mlResult = await MLResult.findById(req.params.id);
    if (!mlResult) return res.status(404).json({ success: false, message: 'ML result not found' });

    if (!['approved', 'auto_minted'].includes(mlResult.status)) {
      return res.status(400).json({ success: false, message: `Cannot mark as minted: status is ${mlResult.status}` });
    }

    mlResult.status = 'minted';
    mlResult.creditId = creditId;
    await mlResult.save();
    res.status(200).json({ success: true, message: 'Marked as minted', result: mlResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== APPEAL: FILE ==========
exports.fileAppeal = async (req, res) => {
  try {
    const { appealReason } = req.body;
    if (!appealReason) return res.status(400).json({ success: false, message: 'Appeal reason is required' });

    const mlResult = await MLResult.findById(req.params.id);
    if (!mlResult) return res.status(404).json({ success: false, message: 'ML result not found' });
    if (mlResult.status !== 'auto_denied') return res.status(400).json({ success: false, message: 'Only denied results can be appealed' });
    if (mlResult.appealDeadline && new Date() > mlResult.appealDeadline) {
      return res.status(400).json({ success: false, message: 'Appeal deadline passed (30 days)' });
    }
    if (mlResult.appealStatus === 'pending') return res.status(400).json({ success: false, message: 'Appeal already filed' });

    mlResult.appealStatus = 'pending';
    mlResult.appealReason = appealReason;
    mlResult.appealFiledAt = new Date();
    mlResult.status = 'appealed';
    await mlResult.save();

    res.status(200).json({ success: true, message: 'Appeal filed. Admin will review within 30 days.', result: mlResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== APPEAL: REVIEW ==========
exports.reviewAppeal = async (req, res) => {
  try {
    const { decision, adminNotes } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approve or reject' });
    }

    const mlResult = await MLResult.findById(req.params.id);
    if (!mlResult) return res.status(404).json({ success: false, message: 'ML result not found' });
    if (mlResult.status !== 'appealed') return res.status(400).json({ success: false, message: 'No pending appeal found' });

    mlResult.appealReviewedAt  = new Date();
    mlResult.appealReviewedBy  = req.user._id;
    mlResult.appealAdminNotes  = adminNotes || '';

    if (decision === 'approve') {
      mlResult.appealStatus  = 'approved';
      mlResult.status        = 'auto_minted';
      mlResult.autoMintedAt  = new Date();
      await Project.findByIdAndUpdate(mlResult.projectId, { status: 'verified' });
    } else {
      mlResult.appealStatus = 'rejected';
      mlResult.status       = 'appeal_rejected';
    }

    await mlResult.save();
    res.status(200).json({
      success: true,
      message: decision === 'approve' ? 'Appeal approved. Credits minted.' : 'Appeal rejected.',
      result: mlResult
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};