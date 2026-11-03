// Officer login API calls. Sends the cookie, the browser never sees the token.

const GENERIC_LOGIN_ERROR = 'Incorrect email or password.'

async function postJson(path, body) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    const err = new Error('We could not reach the server. Please try again in a moment.')
    err.network = true
    throw err
  }
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

// log in, returns { officer, redirect }. Throws the server's error message.
export async function signInOfficer({ identifier, password }) {
  const { res, data } = await postJson('/api/officer/login', { identifier, password })
  if (res.status === 429) {
    throw new Error(data.error || 'Too many attempts. Please try again later.')
  }
  if (!res.ok) {
    throw new Error(data.error || GENERIC_LOGIN_ERROR)
  }
  return data // { officer, redirect }
}

// current session, or null
export async function getOfficerSession() {
  let res
  try {
    res = await fetch('/api/officer/me', { credentials: 'include' })
  } catch {
    return null
  }
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  return data.officer ?? null
}

export async function logoutOfficer() {
  await fetch('/api/officer/logout', { method: 'POST', credentials: 'include' }).catch(
    () => {},
  )
}

export async function changeOfficerPassword({ currentPassword, newPassword }) {
  const { res, data } = await postJson('/api/officer/change-password', {
    currentPassword,
    newPassword,
  })
  if (!res.ok) throw new Error(data.error || 'Could not change your password.')
  return data
}

// ask for a reset code (same reply whether the email exists or not)
export async function requestOfficerPasswordReset(email) {
  const { res, data } = await postJson('/api/officer/forgot-password', { email })
  if (res.status === 429) {
    throw new Error(data.error || 'Too many requests. Please try again later.')
  }
}

// check the code, returns a reset token
export async function verifyOfficerResetCode({ email, code }) {
  const { res, data } = await postJson('/api/officer/verify-reset-code', { email, code })
  if (!res.ok) throw new Error(data.error || 'That code is incorrect or has expired.')
  return data.resetToken
}

export async function resetOfficerPassword({ token, newPassword }) {
  const { res, data } = await postJson('/api/officer/reset-password', { token, newPassword })
  if (!res.ok) throw new Error(data.error || 'Your reset session has expired. Please start again.')
  return data
}

/* own profile */

async function profileRequest(path, { method, json, form }) {
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : form,
    })
  } catch {
    throw new Error('We could not reach the server. Please try again in a moment.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.unauthorized = res.status === 401
    throw err
  }
  return data.officer
}

// update name / job title / phone
export function updateOfficerProfile(patch) {
  return profileRequest('/api/officer/profile', { method: 'PATCH', json: patch })
}

// upload a new profile photo
export function uploadOfficerAvatar(file) {
  const form = new FormData()
  form.append('avatar', file)
  return profileRequest('/api/officer/profile/avatar', { method: 'POST', form })
}

export function removeOfficerAvatar() {
  return profileRequest('/api/officer/profile/avatar', { method: 'DELETE' })
}
