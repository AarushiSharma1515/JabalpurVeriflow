// routes/mintRoutes.js
const express = require("express");
const router = express.Router();
const { mintCarbonCredit, transferCarbonCredit } = require("../blockchain/solanaService");
// const MRVResult = require("../models/MRVResult"); // uncomment with your actual model

// POST /api/admin/mint
// Body: { projectId, co2_t_per_ha, plotName, ecosystem }
router.post("/mint", async (req, res) => {
  try {
    const { projectId, co2_t_per_ha, plotName, ecosystem } = req.body;
    if (!projectId || !co2_t_per_ha) return res.status(400).json({ error: "projectId and co2_t_per_ha required" });

    // Uncomment to fetch from MongoDB instead:
    // const mrvResult = await MRVResult.findById(projectId);
    // if (!mrvResult) return res.status(404).json({ error: "Not found" });

    const mrvResult = { projectId, plotName, co2_t_per_ha, ecosystem };
    const result = await mintCarbonCredit(mrvResult);

    // Uncomment to save mint result to MongoDB:
    // await MRVResult.findByIdAndUpdate(projectId, {
    //   status: "minted",
    //   blockchain: { mintAddresses: result.mintAddresses, metadataUri: result.metadataUri, mintedAt: new Date() }
    // });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Mint error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/transfer
// Body: { mintAddress, buyerWallet }
// Transfer a single NFT from admin wallet to buyer
router.post("/transfer", async (req, res) => {
  try {
    const { mintAddress, buyerWallet } = req.body;
    if (!mintAddress || !buyerWallet) return res.status(400).json({ error: "mintAddress and buyerWallet required" });
    const result = await transferCarbonCredit(mintAddress, buyerWallet);
    res.json(result);
  } catch (err) {
    console.error("Transfer error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;