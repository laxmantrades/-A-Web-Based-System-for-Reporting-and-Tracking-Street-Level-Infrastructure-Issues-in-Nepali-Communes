import sharp from 'sharp'

// Redaction: draw black boxes on the original photo and return a JPEG.
// Boxes are in pixels of the original (after EXIF rotation), not screen size.

export const MAX_RECTS = 50

function badRequest(message) {
  const err = new Error(message)
  err.status = 400
  return err
}

// check the boxes: reject bad ones, clip ones that go past the edge
export function validateRects(input, imgW, imgH) {
  if (!Array.isArray(input) || input.length === 0) {
    throw badRequest(
      'Provide at least one rectangle. To clear a redaction, use "Remove redaction" instead.',
    )
  }
  if (input.length > MAX_RECTS) {
    throw badRequest(`Too many rectangles — the maximum is ${MAX_RECTS}.`)
  }

  return input.map((r, i) => {
    const x = Number(r?.x)
    const y = Number(r?.y)
    const w = Number(r?.width ?? r?.w)
    const h = Number(r?.height ?? r?.h)

    if (![x, y, w, h].every(Number.isFinite)) {
      throw badRequest(`Rectangle ${i + 1} has invalid coordinates.`)
    }
    if (w <= 0 || h <= 0) {
      throw badRequest(`Rectangle ${i + 1} has a negative or zero width/height.`)
    }
    if (x >= imgW || y >= imgH || x + w <= 0 || y + h <= 0) {
      throw badRequest(`Rectangle ${i + 1} is entirely outside the image.`)
    }

    // clip to the edges
    const cx = Math.max(0, Math.round(x))
    const cy = Math.max(0, Math.round(y))
    const cw = Math.min(imgW, Math.round(x + w)) - cx
    const ch = Math.min(imgH, Math.round(y + h)) - cy
    return { x: cx, y: cy, width: cw, height: ch }
  })
}

// original: bytes or file path, rectangles: boxes from the tool
export async function renderRedactedImage(original, rectangles) {
  const base = sharp(original, { failOn: 'none' }).rotate() // apply EXIF rotation
  const meta = await base.metadata()
  const width = meta.width
  const height = meta.height
  if (!width || !height) {
    throw badRequest('The original photo could not be read.')
  }

  const rects = validateRects(rectangles, width, height)

  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}">` +
      rects
        .map(
          (r) =>
            `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="#000000"/>`,
        )
        .join('') +
      `</svg>`,
  )

  const buffer = await base
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer()

  return { buffer, width, height, rects }
}
