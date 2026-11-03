// Creates two demo staff accounts.
//   cd server && node scripts/seedOfficers.js
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
    password: 'officer1234',
    mustChangePassword: true, // forces password change on first login
  },
  {
    name: 'Ravi Thapa',
    email: 'admin@ward.gov.np',
    role: 'admin',
    ward: null,
    jobTitle: 'Municipal Administrator',
    password: 'admin123456',
    mustChangePassword: false,
  },
]

async function main() {
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
      `${a.role.padEnd(7)} ${a.email}  /  ${a.password}` +
        (a.mustChangePassword ? '  (must change on first login)' : ''),
    )
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
