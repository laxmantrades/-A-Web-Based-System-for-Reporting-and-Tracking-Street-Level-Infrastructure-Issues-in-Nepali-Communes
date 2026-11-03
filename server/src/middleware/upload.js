import multer from 'multer'

// Photos are kept in memory (not saved to disk) and sent straight to Cloudinary.

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
    return
  }
  const err = new Error('The photo must be an image file (JPG, PNG, HEIC, WebP).')
  err.status = 400
  cb(err)
}

const multerSingle = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1, fields: 20 },
}).single('photo')

// accepts one `photo` file + text fields, turns multer errors into 400s
function handleMulter(runner) {
  return (req, res, next) => {
    runner(req, res, (err) => {
      if (!err) {
        next()
        return
      }
      if (err instanceof multer.MulterError) {
        err.status = 400
        if (err.code === 'LIMIT_FILE_SIZE') {
          err.message = 'That image is too large. Please use one under 10 MB.'
        }
      }
      next(err)
    })
  }
}

export const uploadReportPhoto = handleMulter(multerSingle)

// profile photo: one `avatar` image
export const uploadAvatar = handleMulter(
  multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_BYTES, files: 1, fields: 5 },
  }).single('avatar'),
)
