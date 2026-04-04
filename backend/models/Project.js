const mongoose = require('mongoose');

const CoordinateSchema = new mongoose.Schema(
	{
		lat: { type: Number },
		lng: { type: Number },
	},
	{ _id: false }
);

const LocationSchema = new mongoose.Schema(
	{
		address: { type: String },
		city: { type: String },
		state: { type: String },
		country: { type: String },
		postalCode: { type: String },
		coordinates: CoordinateSchema,
	},
	{ _id: false }
);

const ImageSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    filename: { type: String },
    url: { type: String },
    thumbnailUrl: { type: String },

    mimeType: { type: String },
    sizeBytes: { type: Number },

    width: { type: Number },
    height: { type: Number },

    // GeoTag
    latitude: { type: Number },
    longitude: { type: Number },

    // Capture timestamp (from mobile)
    capturedAt: { type: Date },

    // Upload timestamp (server)
    uploadedAt: { type: Date, default: Date.now },

    description: { type: String }
  },
  { _id: false }
);


const ProjectSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		description: { type: String },
		owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		location: LocationSchema,
		areaHectares: { type: Number },
		cropType: {
			type: String,
			default: 'other',
		},
		startDate: { type: Date },
		endDate: { type: Date },
		estimatedCredits: { type: Number, default: 0 },
		issuedCredits: { type: Number, default: 0 },
		status: {
			type: String,
			enum: ['draft', 'submitted', 'underReview', 'verified', 'rejected', 'approved'],
			default: 'draft',
		},
        notes:{
            type: String,
            default: ''
        },
		images: [ImageSchema],
		verification: {
			verified: { type: Boolean, default: false },
			verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			verifiedAt: { type: Date },
			notes: { type: String },
		},
		// Field verification (done manually by field operators)
		fieldVerification: {
			verified: { type: Boolean, default: false },
			verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			verifiedAt: { type: Date },
			notes: { type: String },
		},
		// ML Analysis Results (from ML model)
		mlAnalysisResults: {
			status: { type: String },
			job_id: { type: String },
			processing_time_seconds: { type: Number },
			final_results: {
				agb_Mg_per_ha: { type: Number },
				carbon_sequestration_kg: { type: Number },
				study_area_ha: { type: Number },
			},
			component_results: {
				satellite: {
					agb_Mg_per_ha: { type: Number },
					height_m: { type: Number },
					confidence: { type: Number },
					n_points: { type: Number },
				},
				drone: {
					agb_Mg_per_ha: { type: Number },
					area_m2: { type: Number },
					openness: { type: Number },
					carbon_kg: { type: Number },
					co2_kg: { type: Number },
					confidence: { type: Number },
				},
			},
			integration_weights: { type: mongoose.Schema.Types.Mixed },
			metadata: { type: mongoose.Schema.Types.Mixed },
		},
		metadata: { type: mongoose.Schema.Types.Mixed },
	},
	{ timestamps: true }
);

// Indexes to speed up common queries
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ 'location.city': 1, 'location.country': 1 });

module.exports = mongoose.model('Project', ProjectSchema);
