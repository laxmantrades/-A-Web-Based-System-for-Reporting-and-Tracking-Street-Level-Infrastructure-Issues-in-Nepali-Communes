import mongoose from 'mongoose'

const { Schema } = mongoose

// Counters for short report numbers (#142) instead of long Mongo ids.
// nextSequence() increases it atomically so two reports never get the same number.
const counterSchema = new Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
})

const Counter = mongoose.model('Counter', counterSchema)

// add 1 to the counter and return it (first call returns 1)
export async function nextSequence(name) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )
  return doc.seq
}

export default Counter
