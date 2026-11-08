import nodemailer from 'nodemailer'

// Sending emails. If SMTP is set we send for real, otherwise just print to console.
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS - login
//   SMTP_SECURE - "true" for TLS (default only on port 465)
//   MAIL_FROM   - From address
// Gmail: smtp.gmail.com, port 465, and a 16-char App Password.
//
// Render's free plan blocks SMTP, so online we use the Gmail API over HTTPS.
// If these are set they are used instead of SMTP (see DEPLOY.md):
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM } = process.env
const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env

const useGmailApi = Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN)

const port = Number(SMTP_PORT) || 587

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null

const FROM = MAIL_FROM || (SMTP_USER ? `MeroSadak <${SMTP_USER}>` : 'MeroSadak <no-reply@merosadak.local>')

let gmailToken = null // { value, expiresAt }

// get a short-lived access token, reuses it until it's about to expire
async function getGmailToken() {
  if (gmailToken && Date.now() < gmailToken.expiresAt) return gmailToken.value

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Gmail token request returned ${res.status}`)

  const data = await res.json()
  gmailToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return gmailToken.value
}

// send through the Gmail API. nodemailer only builds the email here, it doesn't send it
async function sendWithGmailApi(mail) {
  const builder = nodemailer.createTransport({ streamTransport: true, buffer: true })
  const { message } = await builder.sendMail(mail)

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getGmailToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: message.toString('base64url') }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Gmail API returned ${res.status}`)
}

// test the email login at startup so a wrong password shows up early
export async function verifyMailer() {
  if (useGmailApi) {
    try {
      await getGmailToken()
      console.log('[mail] Gmail API ready')
    } catch (err) {
      console.error('[mail] Gmail API check failed:', err.message)
    }
    return
  }
  if (!transporter) {
    console.log('[mail] SMTP not configured — emails will be printed to the console')
    return
  }
  try {
    await transporter.verify()
    console.log(`[mail] SMTP ready (${SMTP_HOST}:${port})`)
  } catch (err) {
    console.error(`[mail] SMTP check failed (${SMTP_HOST}:${port}):`, err.message)
  }
}

async function send({ to, subject, text, html }) {
  if (useGmailApi) {
    await sendWithGmailApi({ from: FROM, to, subject, text, html })
    return
  }
  if (!transporter) {
    console.log(
      `[mail] (not configured) would send to ${to}\n` +
        `       subject: ${subject}\n` +
        text.replace(/^/gm, '       '),
    )
    return
  }
  await transporter.sendMail({ from: FROM, to, subject, text, html })
}

// email the citizen their report number after submitting
export async function sendTrackingEmail({ to, referenceId }) {
  await send({
    to,
    subject: `Your MeroSadak report #${referenceId}`,
    text:
      `Thanks for reporting a street issue.\n\n` +
      `Your report ID: #${referenceId}\n\n` +
      `You will get an email here whenever the status changes. You can also ` +
      `check progress anytime on the "Track a Report" page using this email ` +
      `address — no account needed.\n`,
  })
}

// status names for the email
const STATUS_TEXT = {
  submitted: 'Submitted',
  acknowledged: 'In Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Not approved',
  duplicate: 'Closed as a duplicate',
}

// email the citizen when the status changes (not for notes or priority).
// no tracking link, tracking is by email only
export async function sendStatusUpdateEmail({ to, referenceId, status, publicNote }) {
  const lines = [`Your report is now: ${STATUS_TEXT[status] || status}`]
  if (publicNote) lines.push('', `Note from the ward office: ${publicNote}`)
  lines.push(
    '',
    `Check the latest on the "Track a Report" page using this email address.`,
    '',
    `You're receiving this because you submitted a report on MeroSadak.`,
  )

  await send({
    to,
    subject: `Update on your report #${referenceId}`,
    text: lines.join('\n') + '\n',
  })
}

// email the citizen when their report is rejected
export async function sendRejectionEmail({ to, referenceId, reasonText, reportUrl }) {
  await send({
    to,
    subject: `Your report #${referenceId} was not approved`,
    text:
      `We have reviewed your report #${referenceId} and it has not been ` +
      `approved for action.\n\n` +
      `${reasonText}\n\n` +
      `If the problem is still there, you can submit a new report with more ` +
      `detail or a clearer photo:\n${reportUrl}\n\n` +
      `You can see this outcome anytime on the "Track a Report" page using ` +
      `this email address.\n\n` +
      `You're receiving this because you submitted a report on MeroSadak.\n`,
  })
}

// shared HTML for the code emails (intro/outro are ours, user text is escaped)
function codeEmailHtml({ intro, code, outro, button }) {
  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
        <tr><td>
          <p style="margin:0 0 4px;font-size:18px;font-weight:bold">MeroSadak</p>
          <p style="margin:0 0 24px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#64748b">Staff portal</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${intro}</p>
          <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;font-family:'Courier New',monospace;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px">${code}</p>
          ${
            button
              ? `<p style="margin:0 0 16px;text-align:center"><a href="${button.href}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:8px">${button.label}</a></p>`
              : ''
          }
          ${outro}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// email an officer their password reset code
export async function sendOfficerPasswordResetCodeEmail({ to, code, validMinutes }) {
  const text =
    `A password reset was requested for your MeroSadak staff account.\n\n` +
    `Your verification code is: ${code}\n\n` +
    `Enter it on the reset page within ${validMinutes} minutes. Never share ` +
    `this code — MeroSadak staff will never ask you for it.\n\n` +
    `If you did not request this, you can ignore this email — your ` +
    `password will not change.\n`

  const html = codeEmailHtml({
    intro: 'A password reset was requested for your staff account. Use this code to continue:',
    code,
    outro:
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#334155">The code expires in ${validMinutes} minutes. Never share it — MeroSadak staff will never ask you for it.</p>` +
      `<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b">If you did not request this, you can ignore this email. Your password will not change.</p>`,
  })

  await send({
    to,
    subject: `${code} is your MeroSadak password reset code`,
    text,
    html,
  })
}

const ROLE_TEXT = {
  officer: 'an officer — you can review, approve and update street reports',
  admin: 'an admin — you can review reports and manage staff accounts',
}

// email a new staff member their setup code and link
export async function sendStaffInviteEmail({ to, name, role, invitedBy, code, setupUrl, validHours }) {
  const roleText = ROLE_TEXT[role] || role
  const text =
    `Hello ${name},\n\n` +
    `${invitedBy} has added you to the MeroSadak staff portal as ${roleText}.\n\n` +
    `Your setup code is: ${code}\n\n` +
    `Open this page, enter the code and choose your password:\n${setupUrl}\n\n` +
    `The code is valid for ${validHours} hours. Never share it.\n\n` +
    `If you weren't expecting this, you can ignore this email.\n`

  const html = codeEmailHtml({
    intro:
      `Hello ${escapeHtml(name)},<br><br>${escapeHtml(invitedBy)} has added you to the ` +
      `MeroSadak staff portal as ${escapeHtml(roleText)}. Use this code to set up your account:`,
    code,
    button: { href: escapeHtml(setupUrl), label: 'Set up my account' },
    outro:
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#334155">The code is valid for ${validHours} hours. Never share it — MeroSadak staff will never ask you for it.</p>` +
      `<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b">If you weren't expecting this, you can ignore this email.</p>`,
  })

  await send({
    to,
    subject: 'You have been added to MeroSadak staff',
    text,
    html,
  })
}
