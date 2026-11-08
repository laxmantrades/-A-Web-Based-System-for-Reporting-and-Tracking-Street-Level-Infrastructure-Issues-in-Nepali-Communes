import mongoose from 'mongoose'

const { Schema } = mongoose

// Classifier settings, saved in the db so they can change without redeploying.
//   enabled       - turn classifying on/off
//   activeVersion - saved with every result
//   thresholds    - score cut-offs: >= high -> HIGH (genuine),
//                   >= medium -> MEDIUM (unsure), else LOW (spam)
const classifierConfigSchema = new Schema(
  {
    key: { type: String, default: 'classifier', unique: true },
    enabled: { type: Boolean, default: true },
    activeVersion: { type: String, default: 'clip-spam-v3' },
    thresholds: {
      high: { type: Number, default: 0.7, min: 0, max: 1 },
      medium: { type: Number, default: 0.3, min: 0, max: 1 },
    },
  },
  { timestamps: true },
)

export const ClassifierConfig = mongoose.model('ClassifierConfig', classifierConfigSchema)

// cache so we don't read the db on every report, cleared on update
let cached = null

export async function getClassifierConfig({ fresh = false } = {}) {
  if (cached && !fresh) return cached
  cached = await ClassifierConfig.findOneAndUpdate(
    { key: 'classifier' },
    { $setOnInsert: { key: 'classifier' } },
    { new: true, upsert: true },
  ).lean()
  return cached
}

export async function updateClassifierConfig(patch) {
  const update = {}
  if (typeof patch.enabled === 'boolean') update.enabled = patch.enabled
  if (typeof patch.activeVersion === 'string' && patch.activeVersion.trim()) {
    update.activeVersion = patch.activeVersion.trim()
  }
  if (patch.thresholds && typeof patch.thresholds === 'object') {
    const { high, medium } = patch.thresholds
    if (Number.isFinite(high)) update['thresholds.high'] = clamp01(high)
    if (Number.isFinite(medium)) update['thresholds.medium'] = clamp01(medium)
  }

  const doc = await ClassifierConfig.findOneAndUpdate(
    { key: 'classifier' },
    { $set: update },
    { new: true, upsert: true },
  ).lean()
  cached = doc
  return doc
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n))
}
