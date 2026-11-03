// Fake cloudinary. Keeps uploads in memory so photo code works without internet.
import { mockState } from './state.js'

export const TEST_CLOUD_HOST = 'res.cloudinary.com'
export const TEST_CLOUD_NAME = 'test-cloud'

export const imageUrlFor = (publicId) =>
  `https://${TEST_CLOUD_HOST}/${TEST_CLOUD_NAME}/image/upload/${publicId}.jpg`

// save bytes like an upload, returns same shape as the real one
export function storeImage(buffer, folder = 'merosadak/reports') {
  mockState.uploadCount += 1
  const publicId = `${folder}/test-${mockState.uploadCount}`
  const url = imageUrlFor(publicId)
  mockState.images.set(publicId, { buffer: Buffer.from(buffer), folder, url })
  return { secure_url: url, public_id: publicId, bytes: buffer.length, format: 'jpg' }
}

export const v2 = {
  config() {},
  uploader: {
    upload_stream(options, callback) {
      return {
        end(buffer) {
          setImmediate(() => callback(null, storeImage(buffer, options?.folder)))
        },
      }
    },
    async destroy(publicId) {
      mockState.destroyed.push(publicId)
      mockState.images.delete(publicId)
      return { result: 'ok' }
    },
  },
}

export default { v2 }
