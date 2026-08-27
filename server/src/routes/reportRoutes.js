import { Router } from 'express'

import {
  listReports,
  getReport,
  createReport,
  updateReportStatus,
} from '../controllers/reportController.js'

/*
 * All routes under /api/reports. Mounted in src/app.js.
 */
const router = Router()

router.get('/', listReports)
router.post('/', createReport)
router.get('/:id', getReport)
router.patch('/:id/status', updateReportStatus)

export default router
