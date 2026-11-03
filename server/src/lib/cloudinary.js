import { v2 as cloudinary } from 'cloudinary'

// Cloudinary is the only place photos are stored (no disk fallback).
// Settings come from CLOUDINARY_URL. Browser never gets cloudinary URLs,
// the API downloads the bytes and sends them on.

// all our photos are under this folder, the proxy refuses anything else
export const REPORTS_FOLDER = 'merosadak/reports'
export const REDACTED_FOLDER = 'merosadak/reports/redacted'
export const AVATARS_FOLDER = 'merosadak/avatars'

let configured = false

// error if CLOUDINARY_URL is missing
export function assertCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error(
      'CLOUDINARY_URL is not set. Report photos are stored in Cloudinary with ' +
        'no local fallback — set CLOUDINARY_URL in server/.env ' +
        '(cloudinary://<api_key>:<api_secret>@<cloud_name>).',
    )
  }
  if (!configured) {
    cloudinary.config({ secure: true })
    configured = true
  }
}

// upload image bytes (big phone photos get resized)
export function uploadImageBuffer(
  buffer,
  {
    folder = REPORTS_FOLDER,
    transformation = [{ width: 2400, height: 2400, crop: 'limit', quality: 'auto:good' }],
  } = {},
) {
  assertCloudinaryConfigured()
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        transformation,
      },
      (err, result) => {
        if (err || !result) {
          reject(err || new Error('Cloudinary upload returned no result'))
          return
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        })
      },
    )
    stream.end(buffer)
  })
}

// download a stored image so the API can send it to the browser
export async function fetchImageBuffer(url) {
  if (!url) throw new Error('No image URL to fetch')
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`)
  const bytes = Buffer.from(await res.arrayBuffer())
  return {
    buffer: bytes,
    contentType: res.headers.get('content-type') || 'image/jpeg',
  }
}

// delete, only logs errors
export async function deleteImage(publicId) {
  if (!publicId) return
  try {
    assertCloudinaryConfigured()
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    })
  } catch (err) {
    console.error(`[cloudinary] failed to delete ${publicId}:`, err.message)
  }
}
