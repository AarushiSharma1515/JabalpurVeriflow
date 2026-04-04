const mongoose = require('mongoose');

const CarbonCreditSchema = new mongoose.Schema({
  mlResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLResult',
    required: true,
    unique: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  projectTitle: {
    type: String,
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmerName: {
    type: String,
    required: true
  },
  ecosystem: {
    type: String,
    default: 'mangrove'
  },
  co2TPerHa: {
    type: Number,
    required: true
  },
  creditsIssued: {
    type: Number,
    required: true,
    min: 1
  },
  carbonKgTotal: {
    type: Number,
    default: null
  },
  mintAddresses: [{
    type: String,
    required: true
  }],
  metadataUri: {
    type: String,
    required: true
  },
  blockchain: {
    network: {
      type: String,
      default: 'solana-devnet'
    },
    mintedAt: {
      type: Date,
      default: Date.now
    },
    explorerUrl: {
      type: String,
      default: null
    }
  },
  status: {
    type: String,
    enum: ['minted', 'partiallyTransferred', 'fullyTransferred', 'burned'],
    default: 'minted'
  },
  transfers: [{
    mintAddress: {
      type: String,
      required: true
    },
    buyerWallet: {
      type: String,
      required: true
    },
    transactionHash: {
      type: String,
      default: null
    },
    transferredAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

CarbonCreditSchema.index({ projectId: 1 });
CarbonCreditSchema.index({ farmerId: 1 });
CarbonCreditSchema.index({ status: 1 });

module.exports = mongoose.model('CarbonCredit', CarbonCreditSchema);
