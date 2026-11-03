import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

// hash a password
export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

// check a password against the hash
export function verifyPassword(plain, hash) {
  if (!hash) return Promise.resolve(false)
  return bcrypt.compare(plain, hash)
}

// password rules: at least 10 chars, one letter and one number.
// returns error message or null
export function checkPasswordRules(plain) {
  if (typeof plain !== 'string' || plain.length < 10) {
    return 'Password must be at least 10 characters long.'
  }
  if (!/[A-Za-z]/.test(plain) || !/[0-9]/.test(plain)) {
    return 'Password must contain at least one letter and one number.'
  }
  return null
}
