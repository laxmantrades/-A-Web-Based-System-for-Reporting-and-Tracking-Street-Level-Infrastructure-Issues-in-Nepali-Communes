import mongoose from 'mongoose'

import { asyncHandler } from '../middleware/errorHandler.js'
import { User, STAFF_ROLES } from '../models/User.js'
import { officerProfile } from './officerController.js'
import {
  AVATARS_FOLDER,
  deleteImage,
  fetchImageBuffer,
  uploadImageBuffer,
} from '../lib/cloudinary.js'

// Officer's own profile (/api/officer/profile).
// Email, role and ward are set by an admin, so read-only here.

const PHONE_RE = /^[0-9+()\-\s]{6,30}$/

// PATCH /api/officer/profile { name?, jobTitle?, phone? }
export const updateOfficerProfile = asyncHandler(async (req, res) => {
  const officer = req.officer
  const body = req.body ?? {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Name must be between 2 and 80 characters.' })
      return
    }
    officer.name = name
  }

  if (body.jobTitle !== undefined) {
    const jobTitle = String(body.jobTitle).trim()
    // required, colleagues see it next to your name
    if (jobTitle.length < 2) {
      res.status(400).json({ error: 'Please enter your job title.' })
      return
    }
    if (jobTitle.length > 80) {
      res.status(400).json({ error: 'Job title must be 80 characters or fewer.' })
      return
    }
    officer.jobTitle = jobTitle
  }

  if (body.phone !== undefined) {
    const phone = String(body.phone).trim()
    if (phone && !PHONE_RE.test(phone)) {
      res.status(400).json({ error: 'Enter a valid phone number (digits, spaces, + or -).' })
      return
    }
    officer.phone = phone
  }

  await officer.save()
  res.json({ officer: officerProfile(officer) })
})

// POST /api/officer/profile/avatar (field `avatar`)
export const uploadOfficerAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Choose an image to upload.' })
    return
  }

  let uploaded
  try {
    uploaded = await uploadImageBuffer(req.file.buffer, {
      folder: AVATARS_FOLDER,
      // square crop around the face
      transformation: [
        { width: 512, height: 512, crop: 'fill', gravity: 'face', quality: 'auto:good' },
      ],
    })
  } catch (err) {
    console.error('[cloudinary] avatar upload failed:', err.message)
    res.status(502).json({ error: 'We could not store your photo. Please try again in a moment.' })
    return
  }

  const officer = req.officer
  const previous = officer.avatarPublicId
  officer.avatarUrl = uploaded.url
  officer.avatarPublicId = uploaded.publicId
  officer.avatarUpdatedAt = new Date()
  await officer.save()

  await deleteImage(previous)
  res.json({ officer: officerProfile(officer) })
})

/** DELETE /api/officer/profile/avatar */
export const removeOfficerAvatar = asyncHandler(async (req, res) => {
  const officer = req.officer
  const previous = officer.avatarPublicId
  officer.avatarUrl = ''
  officer.avatarPublicId = ''
  officer.avatarUpdatedAt = new Date()
  await officer.save()

  await deleteImage(previous)
  res.json({ officer: officerProfile(officer) })
})

// GET /api/officer/profile/avatar - your photo
export const getOfficerAvatar = asyncHandler(async (req, res) => {
  const { avatarUrl } = req.officer
  if (!avatarUrl) {
    res.status(404).json({ error: 'No profile photo.' })
    return
  }
  try {
    const { buffer, contentType } = await fetchImageBuffer(avatarUrl)
    // URL has a version, so cache for a day
    res.set('Cache-Control', 'private, max-age=86400')
    res.set('Content-Type', contentType)
    res.send(buffer)
  } catch (err) {
    console.error('[photo] avatar proxy failed:', err.message)
    res.status(502).json({ error: 'Photo temporarily unavailable.' })
  }
})

// GET /api/officer/staff/:id/avatar - a colleague's photo (officers only)
export const getStaffAvatar = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ error: 'No profile photo.' })
    return
  }
  const user = await User.findOne(
    { _id: id, role: { $in: STAFF_ROLES } },
    { avatarUrl: 1 },
  ).lean()
  if (!user?.avatarUrl) {
    res.status(404).json({ error: 'No profile photo.' })
    return
  }
  try {
    const { buffer, contentType } = await fetchImageBuffer(user.avatarUrl)
    res.set('Cache-Control', 'private, max-age=86400')
    res.set('Content-Type', contentType)
    res.send(buffer)
  } catch (err) {
    console.error('[photo] staff avatar proxy failed:', err.message)
    res.status(502).json({ error: 'Photo temporarily unavailable.' })
  }
})
