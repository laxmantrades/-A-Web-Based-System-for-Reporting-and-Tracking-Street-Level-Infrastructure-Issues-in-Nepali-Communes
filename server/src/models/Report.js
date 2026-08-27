import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * The fixed street-issue categories. Must stay in sync with the frontend list
 * in client/src/data/categories.js (the `id` values).
 */
export const CATEGORIES = [
  'pothole',
  'road_sign',
  'streetlight',
  'road_marking',
  'footpath',
  'drain',
]

/**
 * Issue lifecycle (state machine). Allowed transitions are enforced in the
 * controller, not here — the schema only lists the valid states.
 *
 *   submitted ─▶ acknowledged ─▶ in_progress ─▶ resolved
 *        └──────────────┴───────────────┴────▶ rejected / duplicate
 */
export const STATUSES = [
  'submitted',
  'acknowledged',
  'in_progress',
  'resolved',
  'rejected',
  'duplicate',
]

export const PRIORITIES = ['low', 'medium', 'high']

/**
 * One entry in a report's audit trail. Every status change appends one of
 * these, so we always know who changed what and when.
 */
const statusEventSchema = new Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    note: { type: String, trim: true, default: '' },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

/**
 * Result of the AI photo check. Advisory only — shown to officers, never to
 * citizens, and it never changes a report's status by itself.
 *
 * TODO (AI sprint): the Python zero-shot service fills this in and the API
 * stores the response here.
 */
const aiValidationSchema = new Schema(
  {
    // Bucketed confidence the officer sees.
    verdict: {
      type: String,
      enum: ['match', 'unsure', 'mismatch', 'not_checked'],
      default: 'not_checked',
    },
    // Raw model score for the chosen category, 0..1.
    score: { type: Number, min: 0, max: 1, default: null },
    modelName: { type: String, default: null }, // e.g. "CLIP ViT-B/32"
    checkedAt: { type: Date, default: null },
  },
  { _id: false },
)

const reportSchema = new Schema(
  {
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 1000 },

    // Path / URL to the uploaded photo. File storage is handled separately;
    // the DB only keeps the reference.
    photoUrl: { type: String, required: true },

    /**
     * Location as a GeoJSON Point: coordinates are [longitude, latitude].
     * The 2dsphere index (below) lets us query "reports near here" later.
     */
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
      address: { type: String, trim: true, default: '' },
    },

    ward: { type: Number, required: true, min: 1 },

    // What the citizen suggested vs. what the officer decided.
    suggestedPriority: { type: String, enum: PRIORITIES, default: 'medium' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },

    status: { type: String, enum: STATUSES, default: 'submitted' },
    statusHistory: { type: [statusEventSchema], default: [] },

    aiValidation: { type: aiValidationSchema, default: () => ({}) },

    // Optional: set when a signed-in citizen reports. Null for anonymous.
    reporter: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Officer currently handling it.
    assignedOfficer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

// Geospatial index for "near me" queries.
reportSchema.index({ location: '2dsphere' })
// Common dashboard filter: newest open reports in a ward.
reportSchema.index({ ward: 1, status: 1, createdAt: -1 })

/**
 * Seed the audit trail with the initial "submitted" event on creation.
 */
reportSchema.pre('save', function seedHistory(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, note: 'Report created' })
  }
  next()
})

export const Report = mongoose.model('Report', reportSchema)
