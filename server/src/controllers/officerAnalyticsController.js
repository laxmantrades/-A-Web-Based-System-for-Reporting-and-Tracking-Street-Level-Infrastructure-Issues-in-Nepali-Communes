import { Report, CATEGORIES, STATUSES } from '../models/Report.js'
import { asyncHandler } from '../middleware/errorHandler.js'

// Analytics: GET /api/officer/analytics?days=7|30|90
// Numbers for the last `days` days, compared with the period before.
// Status counts are for right now.

const RANGES = [7, 30, 90]
const DEFAULT_RANGE = 30
const DAY_MS = 24 * 60 * 60 * 1000
// days use local time, not UTC
const TIME_ZONE = 'Asia/Kathmandu'

const OPEN_STATUSES = ['submitted', 'acknowledged', 'in_progress']
const DISMISSED_STATUSES = ['rejected', 'duplicate']
const CLASSIFIER_BUCKETS = ['HIGH', 'MEDIUM', 'LOW', 'UNCLASSIFIED']

const dayKey = (date) => date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE }) // YYYY-MM-DD

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const round1 = (n) => (n === null ? null : Math.round(n * 10) / 10)

// hours from submit to first staff action
function firstResponseHours(report) {
  const first = report.statusHistory
    ?.filter((e) => e.status !== 'submitted' && e.changedAt)
    .sort((a, b) => a.changedAt - b.changedAt)[0]
  if (!first) return null
  return (first.changedAt - report.createdAt) / (60 * 60 * 1000)
}

export const getOfficerAnalytics = asyncHandler(async (req, res) => {
  const requested = Number.parseInt(req.query.days, 10)
  const days = RANGES.includes(requested) ? requested : DEFAULT_RANGE

  const now = new Date()
  const since = new Date(now.getTime() - days * DAY_MS)
  const prevSince = new Date(since.getTime() - days * DAY_MS)

  const [inRange, resolvedInRange, receivedPrev, resolvedPrev, statusCounts] =
    await Promise.all([
      Report.find(
        { createdAt: { $gte: since } },
        {
          category: 1,
          status: 1,
          createdAt: 1,
          'classifier.result': 1,
          'statusHistory.status': 1,
          'statusHistory.changedAt': 1,
        },
      ).lean(),
      Report.find({ resolvedAt: { $gte: since } }, { createdAt: 1, resolvedAt: 1 }).lean(),
      Report.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
      Report.countDocuments({ resolvedAt: { $gte: prevSince, $lt: since } }),
      Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ])

  // reports per day, 0 for empty days
  const daily = new Map()
  for (let i = days - 1; i >= 0; i -= 1) {
    daily.set(dayKey(new Date(now.getTime() - i * DAY_MS)), 0)
  }

  const byCategory = new Map(CATEGORIES.map((c) => [c, 0]))
  const classifier = new Map(
    CLASSIFIER_BUCKETS.map((b) => [b, { result: b, total: 0, dismissed: 0 }]),
  )
  const responseHours = []

  for (const r of inRange) {
    const key = dayKey(r.createdAt)
    if (daily.has(key)) daily.set(key, daily.get(key) + 1)

    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1)

    const bucket = classifier.get(r.classifier?.result) ?? classifier.get('UNCLASSIFIED')
    bucket.total += 1
    if (DISMISSED_STATUSES.includes(r.status)) bucket.dismissed += 1

    const hours = firstResponseHours(r)
    if (hours !== null && hours >= 0) responseHours.push(hours)
  }

  const resolveDays = resolvedInRange
    .map((r) => (r.resolvedAt - r.createdAt) / DAY_MS)
    .filter((d) => d >= 0)

  const statusMap = new Map(statusCounts.map((s) => [s._id, s.count]))

  res.json({
    days,
    since,
    timeZone: TIME_ZONE,
    totals: {
      received: inRange.length,
      receivedPrev,
      resolved: resolvedInRange.length,
      resolvedPrev,
      open: OPEN_STATUSES.reduce((sum, s) => sum + (statusMap.get(s) ?? 0), 0),
      medianFirstResponseHours: round1(median(responseHours)),
      firstResponseSample: responseHours.length,
      medianResolveDays: round1(median(resolveDays)),
      resolveSample: resolveDays.length,
    },
    daily: [...daily].map(([date, count]) => ({ date, count })),
    byCategory: [...byCategory]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: STATUSES.map((status) => ({ status, count: statusMap.get(status) ?? 0 })),
    classifier: [...classifier.values()],
  })
})
