import { Routes, Route, Navigate } from 'react-router-dom'

import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import ReportIssue from './pages/ReportIssue'
import ConfirmationPage from './pages/ConfirmationPage'
import PublicReports from './pages/PublicReports'
import PublicReportDetail from './pages/PublicReportDetail'
import TrackReport from './pages/TrackReport'
import OfficerRoute from './components/officer/OfficerRoute'
import OfficerLogin from './pages/officer/OfficerLogin'
import OfficerForgotPassword from './pages/officer/OfficerForgotPassword'
import OfficerChangePassword from './pages/officer/OfficerChangePassword'
import OfficerQueue from './pages/officer/OfficerQueue'
import OfficerReportDetail from './pages/officer/OfficerReportDetail'
import OfficerRedact from './pages/officer/OfficerRedact'
import OfficerAnalytics from './pages/officer/OfficerAnalytics'
import OfficerProfile from './pages/officer/OfficerProfile'
import OfficerStaff from './pages/officer/OfficerStaff'
import ComingSoon from './pages/ComingSoon'

/*
 * Routes. Citizen pages use PublicLayout (navbar + footer).
 * Staff pages don't. Pages inside OfficerRoute need login.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/report/confirmation" element={<ConfirmationPage />} />
        <Route path="/reports" element={<PublicReports />} />
        <Route path="/reports/:referenceId" element={<PublicReportDetail />} />
        <Route path="/track" element={<TrackReport />} />
        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Route>

      {/* staff pages */}
      <Route path="/officer/login" element={<OfficerLogin />} />
      <Route path="/officer/forgot-password" element={<OfficerForgotPassword />} />
      <Route
        path="/officer/setup-account"
        element={<OfficerForgotPassword key="setup" mode="setup" />}
      />
      <Route
        path="/officer/reset-password"
        element={<Navigate to="/officer/forgot-password" replace />}
      />

      <Route element={<OfficerRoute />}>
        <Route path="/officer" element={<Navigate to="/officer/queue" replace />} />
        <Route path="/officer/queue" element={<OfficerQueue />} />
        <Route path="/officer/analytics" element={<OfficerAnalytics />} />
        <Route path="/officer/profile" element={<OfficerProfile />} />
        <Route path="/officer/staff" element={<OfficerStaff />} />
        <Route path="/officer/reports/:id" element={<OfficerReportDetail />} />
        <Route path="/officer/reports/:id/redact" element={<OfficerRedact />} />
        <Route path="/officer/change-password" element={<OfficerChangePassword />} />
      </Route>
    </Routes>
  )
}
