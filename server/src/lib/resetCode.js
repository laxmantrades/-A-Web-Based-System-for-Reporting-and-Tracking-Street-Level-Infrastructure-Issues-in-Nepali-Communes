import { randomInt, createHash } from 'node:crypto'

// 6-digit email codes for forgot password and staff invites.
// Only the hash is saved (with the account id mixed in).

export const sha256 = (raw) => createHash('sha256').update(raw).digest('hex')

export const hashResetCode = (officerId, code) => sha256(`${officerId}:${code}`)

// put a new code on the account and save. Returns the code for the email.
export async function issueResetCode(officer, ttlMinutes) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  officer.resetCodeHash = hashResetCode(officer.id, code)
  officer.resetCodeExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
  officer.resetCodeAttempts = 0
  officer.resetCodeSentAt = new Date()
  officer.resetTokenHash = null
  officer.resetTokenExpiresAt = null
  await officer.save()
  return code
}
