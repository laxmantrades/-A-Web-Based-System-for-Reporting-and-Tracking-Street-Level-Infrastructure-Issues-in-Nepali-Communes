import { useEffect, useRef, useState } from 'react'

// small preview with solid black boxes, like the saved result.
// rects are 0-1 values
export default function RedactionPreview({ src, rects }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setReady(true)
    }
    img.src = src
    return () => {
      img.onload = null
    }
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !ready) return
    const maxW = 260
    const aspect = img.naturalWidth / img.naturalHeight || 1
    const w = Math.min(maxW, img.naturalWidth)
    const h = w / aspect
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const g = canvas.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.drawImage(img, 0, 0, w, h)
    g.fillStyle = '#000000'
    for (const r of rects || []) {
      g.fillRect(r.x * w, r.y * h, r.w * w, r.h * h)
    }
  }, [rects, ready])

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[260px] rounded-md border border-slate-300 bg-slate-100"
      aria-label="Preview of the redacted photo"
    />
  )
}
