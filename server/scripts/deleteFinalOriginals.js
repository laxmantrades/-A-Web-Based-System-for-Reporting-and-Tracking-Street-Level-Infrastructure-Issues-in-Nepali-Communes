// One-off: delete originals of redacted reports that were already closed/rejected
// before this rule existed. New reports do this automatically.
//   node scripts/deleteFinalOriginals.js          dry run
//   node scripts/deleteFinalOriginals.js --apply  really delete (can't undo)
import 'dotenv/config'

import mongoose from 'mongoose'

import { connectDatabase } from '../src/config/db.js'
import { Report } from '../src/models/Report.js'
import { retireOriginalIfFinal, finishRetiringOriginal } from '../src/lib/photoRetention.js'

const apply = process.argv.includes('--apply')

await connectDatabase(process.env.MONGODB_URI)

const reports = await Report.find({
  hasRedaction: true,
  status: { $in: ['closed', 'rejected', 'duplicate'] },
  originalDeletedAt: null,
})

console.log(
  `${reports.length} final redacted report(s) still have their original` +
    (apply ? ' — deleting.' : ' (dry run; pass --apply to delete).'),
)

for (const report of reports) {
  if (!apply) {
    console.log(`  #${report.referenceId}  ${report.status}  original=${report.photoPublicId}`)
    continue
  }
  const originalPublicId = retireOriginalIfFinal(report, null)
  await report.save()
  await finishRetiringOriginal(report, null, originalPublicId)
  console.log(`  #${report.referenceId}  original deleted`)
}

await mongoose.disconnect()
