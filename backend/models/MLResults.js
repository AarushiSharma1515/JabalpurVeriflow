const mongoose = require('mongoose');

const MLResultSchema = new mongoose.Schema({
  // Reference to the project being analyzed
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  
  // Project details (denormalized for quick access)
  projectTitle: {
    type: String,
    required: true
  },
  areaHectares: {
    type: Number,
    required: true
  },
  
  // Farmer who owns the project
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  farmerName: {
    type: String,
    required: true
  },
  
  // ========== ML MODEL OUTPUTS ==========
  // Vegetation structure
  meanHeightM: {
    type: Number,
    default: null,
    comment: 'Mean vegetation height in meters'
  },
  meanRhAtl08M: {
    type: Number,
    default: null,
    comment: 'Mean RH (relative height) from ATL08'
  },
  
  // Biomass estimates
  meanAgbMgPerHa: {
    type: Number,
    default: null,
    comment: 'Above Ground Biomass (Mg/hectare)'
  },
  bgbMgPerHa: {
    type: Number,
    default: null,
    comment: 'Below Ground Biomass (Mg/hectare)'
  },
  totalBiomassMgPerHa: {
    type: Number,
    default: null,
    comment: 'Total Biomass (Mg/hectare)'
  },
  
  // Carbon & CO2 (MOST IMPORTANT for credits)
  carbonMgPerHa: {
    type: Number,
    default: null,
    comment: 'Carbon stored (Mg/hectare)'
  },
  co2TPerHa: {
    type: Number,
    required: true,
    comment: 'CO2 equivalent per hectare (tons/hectare) - used for credit calculation'
  },
  
  // Model performance metrics
  modelR2Mean: {
    type: Number,
    default: null,
    comment: 'Mean R-squared score (0-1, higher is better)'
  },
  modelR2Std: {
    type: Number,
    default: null,
    comment: 'Standard deviation of R-squared'
  },
  modelRmseMean: {
    type: Number,
    default: null,
    comment: 'Root Mean Square Error'
  },
  nSamples: {
    type: Number,
    default: null,
    comment: 'Number of sample points used'
  },
  
  // ========== DERIVED VALUES (calculated) ==========
  totalCo2Tons: {
    type: Number,
    required: true,
    comment: 'Total CO2 for entire project = co2_t_per_ha × area_hectares'
  },
  totalCarbonTons: {
    type: Number,
    required: true,
    comment: 'Total carbon for entire project'
  },
  
  // ========== STATUS TRACKING ==========
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'minted'],
    default: 'pending',
    index: true,
    comment: 'pending: awaiting admin review, approved: ready to mint, minted: credits created'
  },
  
  // Admin review fields
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  adminNotes: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  // Metadata
  modelVersion: {
    type: String,
    default: 'v1.0',
    comment: 'Version of ML model used'
  },
  analysisDate: {
    type: Date,
    default: Date.now
  },
  processingTimeMs: {
    type: Number,
    default: null,
    comment: 'How long analysis took in milliseconds'
  },
  
  // Link to minted credits (populated when minted)
  creditId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CarbonCredit',
    default: null
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted confidence level based on R²
MLResultSchema.virtual('confidenceLevel').get(function() {
  if (!this.modelR2Mean) return 'Unknown';
  if (this.modelR2Mean >= 0.8) return 'High';
  if (this.modelR2Mean >= 0.6) return 'Medium';
  return 'Low';
});

// Virtual for confidence color
MLResultSchema.virtual('confidenceColor').get(function() {
  if (!this.modelR2Mean) return '#666';
  if (this.modelR2Mean >= 0.8) return '#4dff4d';  // Green
  if (this.modelR2Mean >= 0.6) return '#ffaa00';  // Orange
  return '#ff4444';  // Red
});

// Index for efficient queries
MLResultSchema.index({ status: 1, createdAt: -1 });
MLResultSchema.index({ projectId: 1, status: 1 });
MLResultSchema.index({ farmerId: 1, status: 1 });


// Pre-save validation - FIXED VERSION
MLResultSchema.pre('save', function(next) {
  try {
    // Ensure totalCo2Tons is calculated if not provided
    if (!this.totalCo2Tons && this.co2TPerHa && this.areaHectares) {
      this.totalCo2Tons = this.co2TPerHa * this.areaHectares;
    }
    
    // Ensure totalCarbonTons is calculated
    if (!this.totalCarbonTons && this.carbonMgPerHa && this.areaHectares) {
      this.totalCarbonTons = (this.carbonMgPerHa * this.areaHectares);
    }
    
    // Safely call next if it exists
    if (next && typeof next === 'function') {
      next();
    }
  } catch (error) {
    if (next && typeof next === 'function') {
      next(error);
    } else {
      console.error('Error in pre-save hook:', error);
      throw error;
    }
  }
});

module.exports = mongoose.model('MLResult', MLResultSchema);