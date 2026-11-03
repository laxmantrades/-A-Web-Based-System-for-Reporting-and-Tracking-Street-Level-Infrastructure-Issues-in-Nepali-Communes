// Admin staff management. Non-admins get 403.
import { officerFetch } from './officerReportsApi'

export async function fetchStaff() {
  const data = await officerFetch('/api/officer/admin/officers')
  return data.officers
}

// add staff and email an invite
export async function inviteStaff({ name, email, role, ward, jobTitle }) {
  const data = await officerFetch('/api/officer/admin/officers', {
    method: 'POST',
    body: { name, email, role, ward, jobTitle },
  })
  return data.officer
}

export async function resendStaffInvite(id) {
  const data = await officerFetch(`/api/officer/admin/officers/${id}/resend-invite`, {
    method: 'POST',
  })
  return data.officer
}

// change role / ward
export async function updateStaff(id, patch) {
  const data = await officerFetch(`/api/officer/admin/officers/${id}`, {
    method: 'PATCH',
    body: patch,
  })
  return data.officer
}

export async function setStaffActive(id, active) {
  const data = await officerFetch(
    `/api/officer/admin/officers/${id}/${active ? 'reactivate' : 'deactivate'}`,
    { method: 'PATCH' },
  )
  return data.officer
}
