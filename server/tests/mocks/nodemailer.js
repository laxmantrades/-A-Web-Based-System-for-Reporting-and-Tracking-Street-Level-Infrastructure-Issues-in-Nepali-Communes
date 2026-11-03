// Fake nodemailer. Doesn't send, just saves messages in mockState.sentMail.
import { mockState } from './state.js'

export function createTransport() {
  return {
    async verify() {
      return true
    },
    async sendMail(message) {
      mockState.sentMail.push(message)
      return { messageId: `<test-${mockState.sentMail.length}@merosadak.invalid>` }
    },
  }
}

// emails sent so far
export const sentMail = () => mockState.sentMail

export default { createTransport }
