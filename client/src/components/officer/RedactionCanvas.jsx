import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

// Redaction canvas. Boxes are stored as 0-1 values so they work at any size.
// While editing they're see-through, the backend makes them solid black.
// Props: src, initialRects (pixels), mode ('draw' | 'select'), onRectsChange,
// onHistoryChange, onDirtyChange, onEscape
// Ref methods: undo, redo, clearAll, markSaved, getRects (pixels)
const HANDLE = 6 // corner handle half size (px)
const GRAB = 14 // click area for handles (px)
const MIN_SIZE = 0.012 // smallest box (fraction of image)

let seq = 0
const uid = () => `r${Date.now().toString(36)}${(seq += 1).toString(36)}`

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
// inside: 0-1 values, outside: original pixels
const strip = (r) => ({ x: r.x, y: r.y, w: r.w, h: r.h })

const RedactionCanvas = forwardRef(function RedactionCanvas(
  { src, initialRects, mode, onRectsChange, onHistoryChange, onDirtyChange, onEscape },
  ref,
) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const natRef = useRef({ w: 0, h: 0 })
  const seededRef = useRef(false)
  const pastRef = useRef([])
  const futureRef = useRef([])
  const dragRef = useRef(null)
  const lastRectsRef = useRef(null)
  const movedRef = useRef(false)
  const savedRef = useRef('[]')

  const [rects, setRects] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [imgError, setImgError] = useState(false)

  const syncHistory = useCallback(() => {
    onHistoryChange?.({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    })
  }, [onHistoryChange])

  // replace all boxes as one undo step
  const commit = useCallback(
    (next) => {
      pastRef.current.push(rects)
      futureRef.current = []
      lastRectsRef.current = null
      setRects(next)
      setSelectedId((sel) => (next.some((r) => r.id === sel) ? sel : null))
      syncHistory()
    },
    [rects, syncHistory],
  )

  const undo = useCallback(() => {
    if (!pastRef.current.length) return
    futureRef.current.unshift(rects)
    lastRectsRef.current = null
    setRects(pastRef.current.pop())
    setSelectedId(null)
    syncHistory()
  }, [rects, syncHistory])

  const redo = useCallback(() => {
    if (!futureRef.current.length) return
    pastRef.current.push(rects)
    lastRectsRef.current = null
    setRects(futureRef.current.shift())
    setSelectedId(null)
    syncHistory()
  }, [rects, syncHistory])

  const clearAll = useCallback(() => {
    if (rects.length) commit([])
  }, [rects.length, commit])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    commit(rects.filter((r) => r.id !== selectedId))
  }, [selectedId, rects, commit])

  // ---- load image ----
  useEffect(() => {
    setImgReady(false)
    setImgError(false)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const nw = img.naturalWidth || 1
      const nh = img.naturalHeight || 1
      natRef.current = { w: nw, h: nh }
      // load the given boxes (pixels -> 0-1)
      if (!seededRef.current) {
        seededRef.current = true
        const seeded = (initialRects || []).map((r) => ({
          id: uid(),
          x: r.x / nw,
          y: r.y / nh,
          w: (r.width ?? r.w ?? 0) / nw,
          h: (r.height ?? r.h ?? 0) / nh,
        }))
        savedRef.current = JSON.stringify(seeded.map(strip))
        setRects(seeded)
      }
      setImgReady(true)
    }
    img.onerror = () => setImgError(true)
    img.src = src
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src, initialRects])

  // ---- canvas size (fits the screen) ----
  useEffect(() => {
    const fit = () => {
      const img = imgRef.current
      const wrap = wrapRef.current
      if (!img || !wrap) return
      const aspect = img.naturalWidth / img.naturalHeight || 1
      let w = Math.min(wrap.clientWidth, 1100)
      let h = w / aspect
      const maxH = Math.max(260, window.innerHeight * 0.62)
      if (h > maxH) {
        h = maxH
        w = h * aspect
      }
      setSize({ w: Math.round(w), h: Math.round(h) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [imgReady])

  // ---- clear selection when not in select mode ----
  useEffect(() => {
    if (mode !== 'select') setSelectedId(null)
  }, [mode])

  // ---- tell the parent ----
  useEffect(() => {
    onRectsChange?.(rects.map(strip))
    onDirtyChange?.(JSON.stringify(rects.map(strip)) !== savedRef.current)
  }, [rects, onRectsChange, onDirtyChange])

  // ---- draw ----
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imgReady || !size.w) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const g = canvas.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, size.w, size.h)
    g.drawImage(img, 0, 0, size.w, size.h)

    for (const r of rects) {
      const x = r.x * size.w
      const y = r.y * size.h
      const w = r.w * size.w
      const h = r.h * size.h
      g.fillStyle = 'rgba(0,0,0,0.55)'
      g.fillRect(x, y, w, h)
      const selected = mode === 'select' && r.id === selectedId
      g.lineWidth = selected ? 2 : 1
      g.strokeStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.8)'
      g.setLineDash(selected ? [] : [5, 3])
      g.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1))
      g.setLineDash([])

      if (selected) {
        for (const [hx, hy] of [
          [x, y],
          [x + w, y],
          [x, y + h],
          [x + w, y + h],
        ]) {
          g.fillStyle = '#ffffff'
          g.strokeStyle = '#0f172a'
          g.lineWidth = 1
          g.fillRect(hx - HANDLE, hy - HANDLE, HANDLE * 2, HANDLE * 2)
          g.strokeRect(hx - HANDLE, hy - HANDLE, HANDLE * 2, HANDLE * 2)
        }
        const bx = x + w + 11
        const by = y - 11
        g.fillStyle = '#dc2626'
        g.beginPath()
        g.arc(bx, by, 9, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = '#ffffff'
        g.lineWidth = 1.6
        g.beginPath()
        g.moveTo(bx - 3.5, by - 3.5)
        g.lineTo(bx + 3.5, by + 3.5)
        g.moveTo(bx + 3.5, by - 3.5)
        g.lineTo(bx - 3.5, by + 3.5)
        g.stroke()
      }
    }
  }, [rects, selectedId, mode, size, imgReady])

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') {
        if (dragRef.current) {
          // cancel current drag
          setRects(dragRef.current.base)
          dragRef.current = null
          lastRectsRef.current = null
        } else {
          onEscape?.()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, deleteSelected, selectedId, onEscape])

  // ---- pointer helpers ----
  const toNorm = (e) => {
    const box = canvasRef.current.getBoundingClientRect()
    return {
      nx: clamp((e.clientX - box.left) / box.width, 0, 1),
      ny: clamp((e.clientY - box.top) / box.height, 0, 1),
    }
  }

  const hitHandle = (r, px, py) => {
    const corners = {
      nw: [r.x, r.y],
      ne: [r.x + r.w, r.y],
      sw: [r.x, r.y + r.h],
      se: [r.x + r.w, r.y + r.h],
    }
    for (const [name, [cx, cy]] of Object.entries(corners)) {
      if (Math.abs(cx * size.w - px) <= GRAB && Math.abs(cy * size.h - py) <= GRAB) return name
    }
    return null
  }

  const hitDelete = (r, px, py) =>
    Math.hypot((r.x + r.w) * size.w + 11 - px, r.y * size.h - 11 - py) <= 12

  const hitBody = (r, px, py) => {
    const x = r.x * size.w
    const y = r.y * size.h
    return px >= x && px <= x + r.w * size.w && py >= y && py <= y + r.h * size.h
  }

  const onPointerDown = (e) => {
    if (!imgReady) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const { nx, ny } = toNorm(e)
    const px = nx * size.w
    const py = ny * size.h
    movedRef.current = false
    lastRectsRef.current = null

    if (mode === 'select') {
      const sel = rects.find((r) => r.id === selectedId)
      if (sel) {
        const corner = hitHandle(sel, px, py)
        if (corner) {
          dragRef.current = { kind: 'resize', id: sel.id, corner, base: rects, orig: { ...sel } }
          return
        }
        if (hitDelete(sel, px, py)) {
          deleteSelected()
          return
        }
      }
      const hit = [...rects].reverse().find((r) => hitBody(r, px, py))
      if (hit) {
        setSelectedId(hit.id)
        dragRef.current = {
          kind: 'move',
          id: hit.id,
          base: rects,
          orig: { ...hit },
          anchorNx: nx,
          anchorNy: ny,
        }
      } else {
        setSelectedId(null)
      }
      return
    }

    // draw: new box
    const id = uid()
    const draft = { id, x: nx, y: ny, w: 0, h: 0 }
    dragRef.current = { kind: 'new', id, base: rects, anchorNx: nx, anchorNy: ny }
    lastRectsRef.current = [...rects, draft]
    setRects(lastRectsRef.current)
    setSelectedId(id)
  }

  const onPointerMove = (e) => {
    const g = dragRef.current
    if (!g) return
    movedRef.current = true
    const { nx, ny } = toNorm(e)
    let next

    if (g.kind === 'new') {
      const box = {
        id: g.id,
        x: Math.min(g.anchorNx, nx),
        y: Math.min(g.anchorNy, ny),
        w: Math.abs(nx - g.anchorNx),
        h: Math.abs(ny - g.anchorNy),
      }
      next = [...g.base, box]
    } else if (g.kind === 'move') {
      const dx = nx - g.anchorNx
      const dy = ny - g.anchorNy
      const x = clamp(g.orig.x + dx, 0, 1 - g.orig.w)
      const y = clamp(g.orig.y + dy, 0, 1 - g.orig.h)
      next = g.base.map((r) => (r.id === g.id ? { ...g.orig, x, y } : r))
    } else {
      // resize
      let { x, y, w, h } = g.orig
      const right = x + w
      const bottom = y + h
      if (g.corner === 'nw') {
        x = clamp(nx, 0, right - MIN_SIZE)
        y = clamp(ny, 0, bottom - MIN_SIZE)
        w = right - x
        h = bottom - y
      } else if (g.corner === 'ne') {
        y = clamp(ny, 0, bottom - MIN_SIZE)
        w = clamp(nx, x + MIN_SIZE, 1) - x
        h = bottom - y
      } else if (g.corner === 'sw') {
        x = clamp(nx, 0, right - MIN_SIZE)
        w = right - x
        h = clamp(ny, y + MIN_SIZE, 1) - y
      } else {
        w = clamp(nx, x + MIN_SIZE, 1) - x
        h = clamp(ny, y + MIN_SIZE, 1) - y
      }
      next = g.base.map((r) => (r.id === g.id ? { id: g.id, x, y, w, h } : r))
    }

    lastRectsRef.current = next
    setRects(next)
  }

  const endGesture = (e) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    const g = dragRef.current
    dragRef.current = null
    if (!g) return

    // click without drag: not an undo step, remove the empty box
    if (!movedRef.current) {
      if (g.kind === 'new') {
        setRects(g.base)
        setSelectedId(null)
      }
      lastRectsRef.current = null
      return
    }

    let finalRects = lastRectsRef.current || rects
    if (g.kind === 'new') {
      const box = finalRects.find((r) => r.id === g.id)
      if (!box || box.w < MIN_SIZE || box.h < MIN_SIZE) {
        setRects(g.base)
        setSelectedId(null)
        lastRectsRef.current = null
        return
      }
    }
    pastRef.current.push(g.base)
    futureRef.current = []
    lastRectsRef.current = null
    setRects(finalRects)
    syncHistory()
  }

  // ---- ref methods ----
  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clearAll,
      // boxes in original image pixels
      getRects: () => {
        const { w: nw, h: nh } = natRef.current
        if (!nw || !nh) return []
        return rects.map((r) => ({
          x: Math.round(r.x * nw),
          y: Math.round(r.y * nh),
          width: Math.max(1, Math.round(r.w * nw)),
          height: Math.max(1, Math.round(r.h * nh)),
        }))
      },
      markSaved: () => {
        savedRef.current = JSON.stringify(rects.map(strip))
        onDirtyChange?.(false)
      },
    }),
    [undo, redo, clearAll, rects, onDirtyChange],
  )

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
      {imgError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-sm text-red-700">
          The photo could not be loaded.
        </div>
      ) : !imgReady ? (
        <div className="px-4 py-16 text-sm text-slate-500">Loading photo…</div>
      ) : (
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          style={{
            width: size.w,
            height: size.h,
            touchAction: 'none',
            cursor: mode === 'draw' ? 'crosshair' : 'default',
          }}
          className="max-w-full touch-none select-none rounded-lg border border-slate-300 bg-slate-900 shadow-sm"
        />
      )}
    </div>
  )
})

export default RedactionCanvas
