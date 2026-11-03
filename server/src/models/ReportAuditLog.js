import mongoose from 'mongoose'

const { Schema } = mongoose

// Audit log: one row per officer action. Never edited or deleted.
// Used for the status history officers and citizens see.
export const AUDIT_ACTIONS = [
  'state_change',
  'priority_change',
  'photo_hidden',
  'photo_unhidden',
  'photo_redacted',
  'note_added',
  'report_rejected',
  'redaction_removed',
  'original_photo_deleted',
  'classifier_run',
  'classifier_reclassified',
]

const reportAuditSchema = new Schema(
  {
    report: { type: Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    referenceId: { type: Number, required: true },

    action: { type: String, enum: AUDIT_ACTIONS, required: true },

    // copy of officer info, kept even if they get renamed or deactivated
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: null },

    at: { type: Date, default: Date.now },

    // before / after values
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },

    // reason, or classifier version for classifier entries
    reason: { type: String, default: '' },

    // classifier only: spam type ('chart', 'furniture', ...)
    spamType: { type: String, default: null },

    // note, if any
    note: { type: String, default: '' },
    noteType: { type: String, enum: ['public', 'internal', null], default: null },

    // for the timeline and public filtering
    statusAfter: { type: String, default: null },
    publicVisible: { type: Boolean, default: false },
  },
  { timestamps: true },
)

reportAuditSchema.index({ report: 1, at: 1 })

// block edits to existing rows
function blockMutation(next) {
  next(new Error('Audit log entries are immutable.'))
}
reportAuditSchema.pre('findOneAndUpdate', blockMutation)
reportAuditSchema.pre('updateOne', blockMutation)
reportAuditSchema.pre('updateMany', blockMutation)
reportAuditSchema.pre('deleteOne', blockMutation)
reportAuditSchema.pre('deleteMany', blockMutation)
reportAuditSchema.pre('findOneAndDelete', blockMutation)

export const ReportAuditLog = mongoose.model('ReportAuditLog', reportAuditSchema)

// Add one audit row. Logs errors instead of throwing, so the action still works.
export async function recordReportAudit(entry) {
  try {
    return await ReportAuditLog.create(entry)
  } catch (err) {
    console.error('[audit] failed to record report audit entry:', err.message, entry)
    return null
  }
}
