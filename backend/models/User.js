const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    phone: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'marketplaceuser', 'admin'], default: 'farmer' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verificationStatus: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
    // NEW FIELD: Wallet address for buyers to receive carbon credits
    walletAddress: { 
      type: String, 
      required: false,
      trim: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null
      validate: {
        validator: function(v) {
          if (!v) return true; // Empty is allowed (optional field)
          
          // Ethereum address validation: 0x + 40 hex characters
          const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/i.test(v);
          
          // Solana address validation: Base58 format, 32-44 characters
          const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(v);
          const isValidLength = v.length >= 32 && v.length <= 44;
          const isSolanaAddress = isBase58 && isValidLength;
          
          return isEthereumAddress || isSolanaAddress;
        },
        message: 'Invalid wallet address format. Accept Ethereum (0x + 40 hex) or Solana (Base58, 32-44 chars)'
      }
    },
  },
  { timestamps: true }

);


module.exports = mongoose.model('User', UserSchema);