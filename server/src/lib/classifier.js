// Connects to the AI photo check (spam check). It flags photos that aren't a
// street at all, it doesn't check the category.
// Runs in the background after the report is saved. Result is HIGH / MEDIUM /
// LOW / UNCLASSIFIED. If it fails the result stays empty, report still goes to
// the queue. Only officers see it, it never changes the status.
// Service (CLASSIFIER_URL): POST { imageUrl, category }
//   -> { label } or { score: 0-1 } (+ optional spam type)
// No CLASSIFIER_URL in dev = fake result. CLASSIFIER_FAKE=off turns the fake off.
import { Report } from '../models/Report.js'
import { recordReportAudit } from '../models/ReportAuditLog.js'
import { getClassifierConfig } from '../models/ClassifierConfig.js'

export const CLASSIFIER_RESULTS = ['HIGH', 'MEDIUM', 'LOW', 'UNCLASSIFIED']

const RETRY_DELAY_MS = 800

// HIGH | MEDIUM | LOW, null if it never ran or failed
export function classifierResult(report) {
  return report?.classifier?.result ?? null
}

function bucketFromScore(score, thresholds) {
  if (!Number.isFinite(score)) return 'UNCLASSIFIED'
  if (score >= thresholds.high) return 'HIGH'
  if (score >= thresholds.medium) return 'MEDIUM'
  return 'LOW'
}

function fakeEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.CLASSIFIER_FAKE !== 'off'
}

// fake result for the demo
function fakeResult(seed) {
  let h = 7
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const n = h % 100
  return n < 55 ? 'HIGH' : n < 85 ? 'MEDIUM' : 'LOW'
}

const absoluteUrl = (p) =>
  /^https?:\/\//.test(p)
    ? p
    : `${(process.env.PUBLIC_API_URL || 'http://localhost:5050').replace(/\/$/, '')}${p}`

// one call to the classifier. Returns { result, spamType, score } or throws
async function callClassifierOnce({ photoUrl, category, thresholds }) {
  const endpoint = process.env.CLASSIFIER_URL
  if (!endpoint) {
    if (fakeEnabled()) {
      console.warn('[classifier] CLASSIFIER_URL not set — using deterministic stand-in')
      return { result: fakeResult(`${photoUrl}|${category}`), spamType: null, score: null }
    }
    throw new Error('classifier service not configured')
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: absoluteUrl(photoUrl), category }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`classifier service returned ${res.status}`)

  const data = await res.json()
  const spamType = typeof data.spam === 'string' && data.spam ? data.spam : null
  const score = Number.isFinite(data.score) ? data.score : null
  const label = String(data.label || '').toUpperCase()
  if (CLASSIFIER_RESULTS.includes(label)) return { result: label, spamType, score }
  if (score !== null) {
    return { result: bucketFromScore(score, thresholds), spamType, score }
  }
  throw new Error('classifier service returned an unrecognised payload')
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// run (or re-run) classifying for one report and save the result
export async function runClassification(reportId, { trigger, officer } = {}) {
  const report = await Report.findById(reportId)
  if (!report) return null

  const config = await getClassifierConfig()
  const version = config.activeVersion
  const runAt = new Date()

  let result = null
  let spamType = null
  let score = null
  if (!config.enabled) {
    console.warn(`[classifier] disabled — skipping report ${report.referenceId}`)
  } else {
    try {
      ;({ result, spamType, score } = await callClassifierOnce({
        photoUrl: report.photoUrl,
        category: report.category,
        thresholds: config.thresholds,
      }))
    } catch (err) {
      console.error(`[classifier] attempt 1 failed for #${report.referenceId}:`, err.message)
      await delay(RETRY_DELAY_MS)
      try {
        ;({ result, spamType, score } = await callClassifierOnce({
          photoUrl: report.photoUrl,
          category: report.category,
          thresholds: config.thresholds,
        }))
      } catch (retryErr) {
        console.error(
          `[classifier] retry failed for #${report.referenceId}:`,
          retryErr.message,
        )
        score = null
        result = null // unclassified, report still goes to the queue
      }
    }
  }

  // only keep spam type if the photo got flagged
  if (result === 'HIGH') spamType = null
  report.classifier = { result, spamType, score, runAt, version }
  await report.save()

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: trigger === 'reclassify' ? 'classifier_reclassified' : 'classifier_run',
    actorId: officer?._id ?? null,
    actorName: officer?.name ?? 'System',
    actorRole: officer?.role ?? null,
    at: runAt,
    after: result ?? 'UNCLASSIFIED',
    reason: version,
    spamType,
    publicVisible: false,
  })

  return { result, spamType, runAt, version }
}

// classify a new report in the background, never blocks the request
export function queueClassification(reportId) {
  setImmediate(() => {
    runClassification(reportId, { trigger: 'submission' }).catch((err) =>
      console.error('[classifier] submission job crashed:', err.message),
    )
  })
}
