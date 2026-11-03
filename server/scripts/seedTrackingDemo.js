// Adds demo reports for the tracking page (every status, notes, redacted photo,
// hidden photo, rejected one).
//   cd server && node scripts/seedTrackingDemo.js
// Look up demo@merosadak.local on the tracking page to see them all.
// Running it again replaces only these demo reports.
import 'dotenv/config'

import mongoose from 'mongoose'

import { connectDatabase } from '../src/config/db.js'
import { Report } from '../src/models/Report.js'
import { nextSequence } from '../src/models/Counter.js'

const EMAIL = 'demo@merosadak.local'
// use a public cloudinary sample instead of uploading (the photo proxy accepts it)
const PHOTO_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
const day = 24 * 60 * 60 * 1000
const ago = (d) => new Date(Date.now() - d * day)

const cls = (result) => ({ result, runAt: ago(1), version: 'clip-spam-v2' })

const fixtures = [
  {
    category: 'pothole',
    note: 'Deep pothole right at the junction, hard to avoid on a bike.',
    coordinates: [85.324, 27.7172],
    address: 'Kupondole Road, Lalitpur',
    status: 'submitted',
    priority: null,
    classifier: cls('HIGH'),
    statusHistory: [{ status: 'submitted', note: 'Report created', changedAt: ago(2) }],
  },
  {
    category: 'streetlight',
    note: 'Whole stretch has been dark for a week.',
    coordinates: [85.3155, 27.7051],
    address: 'Pulchowk, Lalitpur',
    status: 'submitted',
    priority: null,
    classifier: cls('MEDIUM'),
    statusHistory: [{ status: 'submitted', note: 'Report created', changedAt: ago(1) }],
  },
  {
    category: 'drain',
    note: '',
    coordinates: [85.3298, 27.7122],
    address: 'Sanepa, Lalitpur',
    status: 'submitted',
    priority: null,
    classifier: cls('LOW'),
    statusHistory: [{ status: 'submitted', note: 'Report created', changedAt: ago(1) }],
  },
  {
    category: 'footpath',
    note: 'Slab lifted right outside the school gate.',
    coordinates: [85.3125, 27.6981],
    address: 'Ekantakuna, Lalitpur',
    status: 'submitted',
    priority: null,
    classifier: { result: null, runAt: null, version: null },
    statusHistory: [{ status: 'submitted', note: 'Report created', changedAt: ago(3) }],
  },
  {
    category: 'streetlight',
    note: '',
    coordinates: [85.3155, 27.7051],
    address: 'Pulchowk, Lalitpur',
    status: 'acknowledged',
    priority: 'medium',
    classifier: cls('HIGH'),
    statusHistory: [
      { status: 'submitted', note: 'Report created', changedAt: ago(6) },
      {
        status: 'acknowledged',
        note: 'Passed initial checks. Passed to the roads team to assess on site.',
        changedAt: ago(4),
      },
    ],
  },
  {
    category: 'drain',
    note: 'Drain overflows onto the footpath whenever it rains.',
    coordinates: [85.334, 27.7096],
    address: 'Thapathali, Kathmandu',
    status: 'in_progress',
    priority: 'high',
    photoStatus: 'redacted',
    classifier: cls('HIGH'),
    internalNotes: [
      { body: 'Ward engineer confirmed a collapsed culvert — bumping to high.', createdAt: ago(10) },
    ],
    statusHistory: [
      { status: 'submitted', note: 'Report created', changedAt: ago(12) },
      { status: 'acknowledged', note: 'Confirmed on site.', changedAt: ago(10) },
      { status: 'in_progress', note: 'Repair scheduled for next week.', changedAt: ago(3) },
    ],
  },
  {
    category: 'pothole',
    note: 'Large pothole outside the clinic gate.',
    coordinates: [85.3281, 27.6935],
    address: 'Kupondole, Lalitpur',
    status: 'in_progress',
    priority: 'high',
    photoStatus: 'hidden',
    classifier: cls('MEDIUM'),
    internalNotes: [
      { body: 'Photo hidden after the reporter emailed asking us to — a car plate was visible.', createdAt: ago(4) },
    ],
    statusHistory: [
      { status: 'submitted', note: 'Report created', changedAt: ago(9) },
      { status: 'acknowledged', note: 'Verified on site.', changedAt: ago(7) },
      {
        status: 'in_progress',
        note: 'Repair crew scheduled.',
        changedAt: ago(4),
      },
    ],
  },
  {
    category: 'road_marking',
    note: '',
    coordinates: [85.3095, 27.7215],
    address: 'Tripureshwor, Kathmandu',
    status: 'resolved',
    priority: 'low',
    classifier: cls('HIGH'),
    statusHistory: [
      { status: 'submitted', note: 'Report created', changedAt: ago(20) },
      { status: 'acknowledged', note: 'Verified.', changedAt: ago(18) },
      { status: 'in_progress', note: 'Crew assigned.', changedAt: ago(10) },
      {
        status: 'resolved',
        note: 'Zebra crossing and stop line repainted.',
        changedAt: ago(2),
      },
    ],
  },
  {
    category: 'footpath',
    note: 'Broken slabs, someone could trip at night.',
    coordinates: [85.3206, 27.7008],
    address: 'Jhamsikhel, Lalitpur',
    status: 'closed',
    priority: 'medium',
    classifier: cls('HIGH'),
    statusHistory: [
      { status: 'submitted', note: 'Report created', changedAt: ago(30) },
      { status: 'acknowledged', note: 'Verified.', changedAt: ago(28) },
      { status: 'in_progress', note: 'Slabs re-laid.', changedAt: ago(14) },
      { status: 'resolved', note: 'Work finished.', changedAt: ago(6) },
      {
        status: 'closed',
        note: 'Closed after the repair was confirmed on a follow-up visit.',
        changedAt: ago(1),
      },
    ],
  },
  {
    category: 'road_sign',
    note: '',
    coordinates: [85.3372, 27.7141],
    address: 'Maitighar, Kathmandu',
    status: 'rejected',
    priority: null,
    photoStatus: 'hidden',
    classifier: cls('LOW'),
    statusHistory: [
      { status: 'submitted', note: 'Report created', changedAt: ago(5) },
      {
        status: 'rejected',
        note: 'We could not identify a street-maintenance issue in the photo. If this is still a problem, please submit a new report with a clearer picture.',
        changedAt: ago(3),
      },
    ],
  },
]

async function main() {
  await connectDatabase(process.env.MONGODB_URI)

  // drop an old unique index from the share-link version if it's still there
  await Report.collection.dropIndex('trackingToken_1').catch(() => {})

  const removed = await Report.deleteMany({ reporterEmail: EMAIL })
  console.log(`removed ${removed.deletedCount} old demo report(s)\n`)

  for (const f of fixtures) {
    const referenceId = await nextSequence('report')
    const isRedacted = f.photoStatus === 'redacted'
    const fixEntry =
      f.statusHistory.find((e) => e.status === 'resolved') ||
      f.statusHistory.find((e) => e.status === 'closed')
    await Report.create({
      category: f.category,
      note: f.note,
      description: f.note,
      photoUrl: PHOTO_URL,
      photoPublicId: `merosadak/reports/demo-${referenceId}`,
      photoStatus: f.photoStatus || 'visible',
      hasRedaction: isRedacted,
      redactedPhotoUrl: isRedacted ? PHOTO_URL : '',
      redactedPhotoPublicId: isRedacted
        ? `merosadak/reports/redacted/demo-${referenceId}`
        : '',
      redaction:
        f.photoStatus === 'redacted'
          ? { rects: [{ x: 40, y: 30, width: 120, height: 80 }], updatedAt: ago(3), updatedBy: null }
          : { rects: [], updatedAt: null, updatedBy: null },
      location: { type: 'Point', coordinates: f.coordinates, address: f.address },
      reporterEmail: EMAIL,
      referenceId,
      status: f.status,
      priority: f.priority ?? null,
      internalNotes: f.internalNotes || [],
      classifier: f.classifier,
      statusHistory: f.statusHistory,
      resolvedAt: fixEntry ? fixEntry.changedAt : null,
    })
    console.log(`#${String(referenceId).padEnd(4)} ${f.status}`)
  }

  console.log(`\nLook this email up on /track to see them all: ${EMAIL}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
