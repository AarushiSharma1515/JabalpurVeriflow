// routes/mintRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { mintCarbonCredit, transferCarbonCredit } = require("../blockchain/solanaService");
const MLResult = require("../models/MLResults");
const CarbonCredit = require("../models/CarbonCredit");
const Project = require("../models/Project");
const Order = require("../models/Order");
const protect = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// Appeal Model
// ─────────────────────────────────────────────────────────────────────────────
const AppealSchema = new mongoose.Schema({
  mlResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MLResult",
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  reason:     { type: String, required: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true
  },
  adminNotes:          { type: String, default: "" },
  reviewedBy:          { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt:          { type: Date, default: null },
  nextAppealAllowedAt: { type: Date, default: null }
}, { timestamps: true });

const Appeal = mongoose.models.Appeal ||
  mongoose.model("Appeal", AppealSchema);


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function executeMint(mlResult) {
  const mrvPayload = {
    projectId:    mlResult.projectId.toString(),
    plotName:     mlResult.projectTitle,
    co2_t_per_ha: mlResult.co2TPerHa,
    ecosystem:    "Mangrove"
  };

  const blockchainResult = await mintCarbonCredit(mrvPayload);

  const credit = await CarbonCredit.create({
    projectId:     mlResult.projectId,
    mlResultId:    mlResult._id,
    farmerId:      mlResult.farmerId,
    plotName:      mlResult.projectTitle,
    co2TPerHa:     mlResult.co2TPerHa,
    confidence:    mlResult.modelR2Mean,
    creditsIssued: blockchainResult.creditsIssued,
    carbonKgTotal: blockchainResult.carbonKg,
    mintAddresses: blockchainResult.mintAddresses,
    metadataUri:   blockchainResult.metadataUri,
  });

  await MLResult.findByIdAndUpdate(mlResult._id, {
    status:   "minted",
    creditId: credit._id
  });

  await Project.findByIdAndUpdate(mlResult.projectId, {
    status: 'verified',
    verificationStatus: 'verified',
    verifiedAt: new Date()
  });

  return { credit, blockchainResult };
}


// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/mint/process - Auto process ML result
router.post("/process", async (req, res) => {
  try {
    const { mlResultId } = req.body;
    const mlResult = await MLResult.findById(mlResultId);
    if (!mlResult) return res.status(404).json({ error: "MLResult not found" });

    const confidence = mlResult.modelR2Mean || 0;

    if (confidence < 0.35) {
      await MLResult.findByIdAndUpdate(mlResultId, { status: "rejected" });
      return res.json({ action: "denied", confidence });
    }

    if (confidence < 0.50) {
      await MLResult.findByIdAndUpdate(mlResultId, { status: "pending" });
      return res.json({ action: "manualSurveyRequired", confidence });
    }

    if (confidence < 0.65) {
      await MLResult.findByIdAndUpdate(mlResultId, { status: "pending" });
      return res.json({ action: "pendingAdminApproval", confidence });
    }

    const { credit, blockchainResult } = await executeMint(mlResult);
    return res.json({ action: "autoMinted", explorerUrl: blockchainResult.explorerUrl });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mint/transfer - Transfer NFT to buyer
router.post("/transfer", async (req, res) => {
  try {
    const { creditId, mintAddress, buyerWallet, transactionHash, orderId } = req.body;
    
    if (!creditId || !mintAddress || !buyerWallet) {
      return res.status(400).json({ error: "creditId, mintAddress and buyerWallet required" });
    }

    const credit = await CarbonCredit.findById(creditId);
    if (!credit) return res.status(404).json({ error: "CarbonCredit not found" });
    
    if (credit.transfers.some(t => t.mintAddress === mintAddress)) {
      return res.status(400).json({ error: "NFT already transferred" });
    }
    
    if (!credit.mintAddresses.includes(mintAddress)) {
      return res.status(400).json({ error: "mintAddress does not belong to this credit" });
    }
    
    const result = await transferCarbonCredit(mintAddress, buyerWallet);
    
    credit.transfers.push({ 
      mintAddress, 
      buyerWallet, 
      transferredAt: new Date(),
      transactionHash: transactionHash || result.signature || result.transactionHash
    });
    
    credit.status = credit.transfers.length === credit.mintAddresses.length
      ? "fullyTransferred"
      : "partiallyTransferred";
    
    await credit.save();

    const txHash = transactionHash || result.signature || result.transactionHash || null;

    // Keep order lifecycle in sync with blockchain transfer.
    // Prefer explicit orderId if provided, otherwise match latest pending order.
    let linkedOrder = null;
    if (orderId) {
      linkedOrder = await Order.findOne({ _id: orderId, status: { $in: ["pending", "approved"] } });
    }
    if (!linkedOrder) {
      linkedOrder = await Order.findOne({
        "project.projectId": credit.projectId,
        buyerWalletAddress: buyerWallet,
        status: { $in: ["pending", "approved"] }
      }).sort({ createdAt: -1 });
    }

    if (linkedOrder) {
      linkedOrder.status = "completed";
      if (txHash) linkedOrder.transactionHash = txHash;
      linkedOrder.adminNotes = "NFT transferred successfully";
      await linkedOrder.save();
    }
    
    res.json({
      success: true,
      mintAddress,
      buyerWallet,
      explorerUrl: result.explorerUrl,
      transactionHash: txHash,
      orderUpdated: Boolean(linkedOrder),
      orderId: linkedOrder?._id || null
    });
    
  } catch (err) {
    console.error("Transfer error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: GET /api/mint/wallet-nfts/:walletAddress
// Returns all NFTs owned by a specific wallet address
// ─────────────────────────────────────────────────────────────────────────────
router.get("/wallet-nfts/:walletAddress", protect, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }
    
    // Find all CarbonCredit entries where this wallet appears in transfers
    const credits = await CarbonCredit.find({
      "transfers.buyerWallet": walletAddress
    }).populate("projectId", "title location areaHectares");
    
    // Extract all NFTs owned by this wallet
    const nfts = [];
    credits.forEach(credit => {
      credit.transfers.forEach(transfer => {
        if (transfer.buyerWallet === walletAddress) {
          nfts.push({
            mintAddress: transfer.mintAddress,
            projectTitle: credit.plotName,
            projectId: credit.projectId,
            carbonTons: 30, // 1 NFT = 30 tons CO2
            transferredAt: transfer.transferredAt,
            transactionHash: transfer.transactionHash,
            metadataUri: credit.metadataUri,
            confidence: credit.confidence
          });
        }
      });
    });
    
    // Calculate totals
    const totalCarbonTons = nfts.length * 30;
    const totalMATIC = nfts.length * 10; // 10 MATIC per NFT
    const totalINR = totalMATIC * 85; // 85 INR per MATIC
    
    res.json({
      success: true,
      nfts,
      count: nfts.length,
      totals: {
        carbonTons: totalCarbonTons,
        matic: totalMATIC,
        inr: totalINR
      }
    });
    
  } catch (err) {
    console.error("Error fetching wallet NFTs:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: GET /api/mint/nft/:mintAddress
// Get details of a specific NFT by its mint address
// ─────────────────────────────────────────────────────────────────────────────
router.get("/nft/:mintAddress", async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    const credit = await CarbonCredit.findOne({
      mintAddresses: mintAddress
    }).populate("projectId", "title location areaHectares cropType");
    
    if (!credit) {
      return res.status(404).json({ error: "NFT not found" });
    }
    
    // Find if this NFT has been transferred
    const transfer = credit.transfers.find(t => t.mintAddress === mintAddress);
    
    res.json({
      success: true,
      nft: {
        mintAddress,
        projectTitle: credit.plotName,
        project: credit.projectId,
        carbonTons: 30,
        mintedAt: credit.mintedAt,
        owner: transfer?.buyerWallet || null,
        transferredAt: transfer?.transferredAt || null,
        transactionHash: transfer?.transactionHash || null,
        metadataUri: credit.metadataUri,
        confidence: credit.confidence
      }
    });
    
  } catch (err) {
    console.error("Error fetching NFT:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mint/appeal - Farmer submits appeal
router.post("/appeal", async (req, res) => {
  try {
    const { mlResultId, farmerId, reason } = req.body;
    
    if (!mlResultId || !farmerId || !reason) {
      return res.status(400).json({ error: "mlResultId, farmerId and reason required" });
    }
    
    const mlResult = await MLResult.findById(mlResultId);
    if (!mlResult) return res.status(404).json({ error: "MLResult not found" });
    
    // Check for 30-day cooldown from last rejected appeal
    const lastRejected = await Appeal.findOne({ 
      mlResultId, 
      farmerId, 
      status: "rejected" 
    }).sort({ reviewedAt: -1 });
    
    if (lastRejected?.nextAppealAllowedAt && new Date() < lastRejected.nextAppealAllowedAt) {
      const daysLeft = Math.ceil((lastRejected.nextAppealAllowedAt - new Date()) / (1000 * 60 * 60 * 24));
      return res.status(429).json({ error: `Appeal cooldown active. Try again in ${daysLeft} days.` });
    }
    
    // Check for existing pending appeal
    const existingPending = await Appeal.findOne({ mlResultId, farmerId, status: "pending" });
    if (existingPending) {
      return res.status(400).json({ error: "You already have a pending appeal for this result" });
    }

    const appeal = await Appeal.create({ 
      mlResultId, 
      farmerId, 
      reason, 
      projectId: mlResult.projectId 
    });
    
    res.json({ success: true, appealId: appeal._id, status: "pending" });
    
  } catch (err) {
    console.error("Appeal error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mint/appeal/review - Admin reviews appeal
router.post("/appeal/review", async (req, res) => {
  try {
    const { appealId, adminId, decision, notes } = req.body;
    
    if (!appealId || !adminId || !decision) {
      return res.status(400).json({ error: "appealId, adminId and decision required" });
    }
    
    const appeal = await Appeal.findById(appealId);
    if (!appeal) return res.status(404).json({ error: "Appeal not found" });
    if (appeal.status !== "pending") return res.status(400).json({ error: "Already reviewed" });

    if (decision === "rejected") {
      const cooldown = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await Appeal.findByIdAndUpdate(appealId, { 
        status: "rejected", 
        reviewedBy: adminId, 
        reviewedAt: new Date(),
        adminNotes: notes || "",
        nextAppealAllowedAt: cooldown 
      });
      return res.json({ action: "appealRejected", nextAppealAllowedAt: cooldown });
    }

    // Approved - trigger mint
    const mlResult = await MLResult.findById(appeal.mlResultId);
    if (!mlResult) return res.status(404).json({ error: "MLResult not found" });
    
    await Appeal.findByIdAndUpdate(appealId, { 
      status: "approved", 
      reviewedBy: adminId, 
      reviewedAt: new Date(),
      adminNotes: notes || "Appeal approved"
    });
    
    const { credit, blockchainResult } = await executeMint(mlResult);
    res.json({ 
      action: "appealApprovedAndMinted", 
      creditId: credit._id,
      explorerUrl: blockchainResult.explorerUrl
    });
    
  } catch (err) {
    console.error("Appeal review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mint/pending - Get all pending ML results (Admin)
router.get("/pending", async (req, res) => {
  try {
    const pending = await MLResult.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("projectId", "title areaHectares")
      .populate("farmerId", "name email");
    res.json({ success: true, pending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mint/credits/:projectId - Get all credits for a project
router.get("/credits/:projectId", async (req, res) => {
  try {
    const credits = await CarbonCredit.find({ projectId: req.params.projectId })
      .populate("projectId", "title location");
    res.json({ success: true, credits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mint/appeals - Get all pending appeals (Admin)
router.get("/appeals", async (req, res) => {
  try {
    const appeals = await Appeal.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("farmerId", "name email")
      .populate("mlResultId", "co2TPerHa modelR2Mean projectTitle");
    res.json({ success: true, appeals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.Appeal = Appeal;