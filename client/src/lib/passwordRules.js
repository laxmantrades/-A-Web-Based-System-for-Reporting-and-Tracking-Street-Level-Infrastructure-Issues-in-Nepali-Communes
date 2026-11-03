// same password rules as the server: 10+ chars, a letter and a number.
// returns error message or null
export function checkPasswordRules(value) {
  if (typeof value !== 'string' || value.length < 10) {
    return 'Password must be at least 10 characters long.'
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must contain at least one letter and one number.'
  }
  return null
}
