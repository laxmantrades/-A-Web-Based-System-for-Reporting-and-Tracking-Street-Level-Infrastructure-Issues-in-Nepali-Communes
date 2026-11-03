import mongoose from 'mongoose'

import { deleteImage } from '../lib/cloudinary.js'

const { Schema } = mongoose

// Report categories. Must match the ids in client/src/data/categories.js.
export const CATEGORIES = [
  'pothole',
  'road_sign',
  'streetlight',
  'road_marking',
  'footpath',
  'drain',
]

// Report statuses. Allowed moves are checked in the controller.
//   submitted -> acknowledged -> in_progress -> resolved -> closed
//   (or rejected / duplicate)
// Citizens see: Submitted, In Review, In Progress, Resolved, Closed,
// and "Report not approved" for rejected / duplicate.
export const STATUSES = [
  'submitted',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
  'duplicate',
]

export const PRIORITIES = ['low', 'medium', 'high']

// One status change: who, what, when.
const statusEventSchema = new Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    note: { type: String, trim: true, default: '' },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

// Note only officers see. Public notes go on statusHistory instead.
const internalNoteSchema = new Schema(
  {
    body: { type: String, trim: true, required: true, maxlength: 1000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

// One black box, in pixels of the original image.
const redactionRectSchema = new Schema(
  {
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

// AI spam check result. Only a hint for officers, never shown to citizens,
// never changes the status by itself.
//   result   HIGH (genuine) | MEDIUM (unsure) | LOW (spam) | UNCLASSIFIED | null
//   spamType e.g. 'furniture', 'chart' (null if genuine)
//   runAt    when it last ran
//   version  classifier version
//   score    raw 0-1 score, saved for evaluation only
const classifierSchema = new Schema(
  {
    result: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'UNCLASSIFIED', null],
      default: null,
    },
    spamType: { type: String, default: null },
    runAt: { type: Date, default: null },
    version: { type: String, default: null },
    // hidden from every query unless asked with .select('+classifier.score')
    score: { type: Number, default: null, select: false },
  },
  { _id: false },
)

// GeoJSON point + street name from reverse geocoding
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
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
  { _id: false },
)

const reportSchema = new Schema(
  {
    category: { type: String, enum: CATEGORIES, required: true },

    // citizen note (max 200 chars). description is for longer officer text, not required
    note: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },

    // original photo url in cloudinary, never sent to the browser (API proxies it)
    photoUrl: { type: String, required: true },
    // cloudinary id of the original, random so it can't be guessed
    photoPublicId: { type: String, default: '' },

    // what the public sees for the photo:
    //   visible  - the photo
    //   hidden   - "Photo hidden by moderator"
    //   redacted - the redacted copy
    photoStatus: {
      type: String,
      enum: ['visible', 'hidden', 'redacted'],
      default: 'visible',
    },
    // photo with black boxes. Original is kept while the report is open,
    // deleted when closed/rejected (see originalDeletedAt).
    hasRedaction: { type: Boolean, default: false },
    redactedPhotoUrl: { type: String, default: '' },
    redactedPhotoPublicId: { type: String, default: '' },
    // the boxes, so the redaction tool can load them again
    redaction: {
      rects: { type: [redactionRectSchema], default: [] },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    // set when the original got deleted after closing.
    // photoUrl then points to the redacted image and redaction can't be changed.
    originalDeletedAt: { type: Date, default: null },

    // citizen email for updates and tracking lookup. Never shown publicly.
    reporterEmail: { type: String, trim: true, lowercase: true, required: true },

    // short number shown to the citizen (#142)
    referenceId: { type: Number, required: true, unique: true },

    // GPS as GeoJSON [lng, lat]. Only set if "Use my location" was used
    // (a half-filled point breaks the 2dsphere index).
    location: { type: pointSchema, default: undefined },

    // written location e.g. "Ward 6, near the temple". Need this, GPS, or both.
    locationDescription: { type: String, trim: true, maxlength: 200, default: '' },

    // set by officer, unknown on submit
    ward: { type: Number, min: 1, default: null },

    // citizen's suggestion vs officer's decision (null until set)
    suggestedPriority: { type: String, enum: PRIORITIES, default: 'medium' },
    priority: { type: String, enum: [...PRIORITIES, null], default: null },

    status: { type: String, enum: STATUSES, default: 'submitted' },
    statusHistory: { type: [statusEventSchema], default: [] },

    // officer-only notes
    internalNotes: { type: [internalNoteSchema], default: [] },

    // rejection info
    rejection: {
      reason: { type: String, default: '' }, // spam | duplicate | out_of_scope | other
      detail: { type: String, trim: true, default: '' },
      at: { type: Date, default: null },
    },

    // when it first got resolved (or closed). Used for "Recently Resolved".
    resolvedAt: { type: Date, default: null },

    classifier: { type: classifierSchema, default: () => ({}) },

    // set if a logged-in citizen reported, null if anonymous
    reporter: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // officer handling it
    assignedOfficer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

// for "near me" queries
reportSchema.index({ location: '2dsphere' })
// newest open reports in a ward
reportSchema.index({ ward: 1, status: 1, createdAt: -1 })
// tracking lookup by email
reportSchema.index({ reporterEmail: 1, createdAt: -1 })
// public page lists
reportSchema.index({ status: 1, createdAt: -1 })
reportSchema.index({ status: 1, resolvedAt: -1 })

// add the first "submitted" entry when created
reportSchema.pre('save', function seedHistory(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, note: 'Report created' })
  }
  next()
})

// if a report gets deleted, delete its redacted image too (not the original)
reportSchema.pre('deleteOne', { document: true, query: false }, function () {
  deleteImage(this.redactedPhotoPublicId)
})
reportSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model
    .findOne(this.getQuery())
    .select('redactedPhotoPublicId')
    .lean()
  if (doc?.redactedPhotoPublicId) deleteImage(doc.redactedPhotoPublicId)
})

export const Report = mongoose.model('Report', reportSchema)
