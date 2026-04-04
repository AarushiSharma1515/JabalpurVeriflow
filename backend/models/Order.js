const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    // Buyer information
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // In the buyerWalletAddress field, update validation:
buyerWalletAddress: {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: function(v) {
      // Solana address validation
      const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(v);
      const isValidLength = v.length >= 32 && v.length <= 44;
      return isBase58 && isValidLength;
    },
    message: 'Invalid Solana wallet address format'
  }
},
    
    // Seller information (farmer who owns the project)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Project details
    project: {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
      },
      title: {
        type: String,
        required: true
      },
      location: {
        type: String,
        default: ''
      },
      carbonKg: {
        type: Number,
        required: true
      },
      carbonTons: {
        type: Number,
        required: true
      }
    },
    
    // Transaction details
    amount: {
      carbonKg: { type: Number, required: true },
      carbonTons: { type: Number, required: true },
      priceMatic: { type: Number, required: true },
      priceUSD: { type: Number, required: true }
    },
    
    // Order status
    status: {
      type: String,
      enum: ['pending', 'approved', 'completed', 'cancelled', 'failed'],
      default: 'pending'
    },
    
    // Blockchain transaction
    transactionHash: {
      type: String,
      default: null,
      trim: true
    },
    
    // Admin notes
    adminNotes: {
      type: String,
      default: ''
    },
    
    // Timestamps for order processing
    processedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Index for faster queries
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });

// Virtual for formatted order ID
OrderSchema.virtual('orderId').get(function() {
  return this._id.toString().slice(-8).toUpperCase();
});

// Update timestamps on status change
OrderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed') {
      this.completedAt = new Date();
    }
    if (this.status === 'approved') {
      this.processedAt = new Date();
    }
  }
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('Order', OrderSchema);