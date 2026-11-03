// Runs before the app loads, so the app reads these fake values.
// server/.env is never loaded in tests.
process.env.NODE_ENV = 'test'

// never the real Atlas db (afterEnv.js refuses anything else)
delete process.env.MONGODB_URI

// fake SMTP host so mailer uses the nodemailer fake (.invalid never resolves)
process.env.SMTP_HOST = 'smtp.test.invalid'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'tests@merosadak.invalid'
process.env.SMTP_PASS = 'not-a-real-password'
delete process.env.MAIL_FROM

// needed to start, cloudinary is faked anyway
process.env.CLOUDINARY_URL = 'cloudinary://test_key:test_secret@test-cloud'

// send classifier calls to the fake so tests control it
process.env.CLASSIFIER_URL = 'http://classifier.test/classify'
process.env.CLASSIFIER_FAKE = 'off'

process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.PUBLIC_APP_URL = 'http://localhost:5173'
