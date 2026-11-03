import { deleteImage } from './cloudinary.js'
import { recordReportAudit } from '../models/ReportAuditLog.js'

// Photo retention: keep the original while the report is open (so redaction can
// be changed), delete it once the report is closed or rejected.

// final statuses, can't go back
const FINAL_STATUSES = new Set(['closed', 'rejected', 'duplicate'])

export const REDACTION_LOCKED =
  'This report is final and its original photo has been deleted, so the redaction can no longer be changed.'

// Call before report.save(). If final and redacted, switch to the redacted photo
// and return the original's id to delete after saving. Otherwise null.
export function retireOriginalIfFinal(report, officer) {
  if (!FINAL_STATUSES.has(report.status) || !report.hasRedaction || report.originalDeletedAt) {
    return null
  }
  const originalPublicId = report.photoPublicId
  report.photoUrl = report.redactedPhotoUrl
  report.photoPublicId = ''
  report.originalDeletedAt = new Date()
  report.internalNotes.push({
    body: 'Original photo permanently deleted now that the report is final. Only the redacted version is kept.',
    author: officer?._id ?? null,
    createdAt: new Date(),
  })
  return originalPublicId || null
}

// after saving: delete the original and log it
export async function finishRetiringOriginal(report, officer, originalPublicId) {
  if (!originalPublicId) return
  await deleteImage(originalPublicId)
  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'original_photo_deleted',
    ...(officer
      ? { actorId: officer._id, actorName: officer.name, actorRole: officer.role }
      : {}),
    publicVisible: false,
  })
}
