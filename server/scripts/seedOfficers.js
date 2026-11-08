// Creates two demo staff accounts.
//   cd server
//   SEED_OFFICER_PASSWORD="..." SEED_ADMIN_PASSWORD="..." node scripts/seedOfficers.js
// Running it again resets them (password, active, lockout).
import 'dotenv/config'

import mongoose from 'mongoose'

import { connectDatabase } from '../src/config/db.js'
import { User } from '../src/models/User.js'
import { hashPassword } from '../src/lib/password.js'

const ACCOUNTS = [
  {
    name: 'Anita Sharma',
    email: 'officer@ward.gov.np',
    role: 'officer',
    ward: 5,
    jobTitle: 'Ward Engineer',
    password: process.env.SEED_OFFICER_PASSWORD,
    mustChangePassword: true, // forces password change on first login
  },
  {
    name: 'Ravi Thapa',
    email: 'admin@ward.gov.np',
    role: 'admin',
    ward: null,
    jobTitle: 'Municipal Administrator',
    password: process.env.SEED_ADMIN_PASSWORD,
    mustChangePassword: false,
  },
]

async function main() {
  if (ACCOUNTS.some((a) => !a.password)) {
    throw new Error('set SEED_OFFICER_PASSWORD and SEED_ADMIN_PASSWORD')
  }

  await connectDatabase(process.env.MONGODB_URI)

  for (const a of ACCOUNTS) {
    await User.findOneAndUpdate(
      { email: a.email },
      {
        name: a.name,
        email: a.email,
        role: a.role,
        ward: a.ward,
        jobTitle: a.jobTitle,
        passwordHash: await hashPassword(a.password),
        mustChangePassword: a.mustChangePassword,
        isActive: true,
        failedLoginCount: 0,
        failedLoginWindowStart: null,
        lockUntil: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    console.log(
      `${a.role.padEnd(7)} ${a.email}` +
        (a.mustChangePassword ? '  (must change on first login)' : ''),
    )
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
