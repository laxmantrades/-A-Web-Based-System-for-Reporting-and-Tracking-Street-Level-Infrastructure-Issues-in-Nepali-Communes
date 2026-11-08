// Gets the Gmail refresh token for Render (DEPLOY.md, step 2b). Only needed once.
//   GMAIL_CLIENT_ID="..." GMAIL_CLIENT_SECRET="..." node scripts/gmailRefreshToken.js
import http from 'node:http'

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env
if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.')
  process.exit(1)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri())
  const code = url.searchParams.get('code')
  if (!code) {
    res.end('No code here, go back to the terminal.')
    return
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    }),
  })
  const data = await tokenRes.json()

  if (data.refresh_token) {
    res.end('Done, you can close this tab and go back to the terminal.')
    console.log(`\nGMAIL_REFRESH_TOKEN=${data.refresh_token}\n`)
    console.log('Put it in Render -> Environment. Keep it secret.')
  } else {
    res.end('Failed, see the terminal.')
    console.error('Google did not return a refresh token:', data.error_description || data.error)
    process.exitCode = 1
  }
  server.close()
  server.closeAllConnections()
})

// local page that Google sends the browser back to
function redirectUri() {
  return `http://127.0.0.1:${server.address().port}`
}

server.listen(0, '127.0.0.1', () => {
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.search = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send', // can only send, not read
    access_type: 'offline', // gives a refresh token
    prompt: 'consent',
  })
  console.log('Open this link and sign in with the Gmail account that sends the emails:\n')
  console.log(auth.toString())
})
