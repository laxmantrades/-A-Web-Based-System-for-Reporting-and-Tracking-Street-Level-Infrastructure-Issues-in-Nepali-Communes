import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageUp, X } from 'lucide-react'

import CameraCapture from './CameraCapture'

// phones open their camera app with <input capture>.
// laptops ignore it, so we use our own camera there
function shouldUseLiveCamera() {
  if (typeof window === 'undefined') return false
  const touchFirst = window.matchMedia?.('(pointer: coarse)').matches
  return Boolean(!touchFirst && navigator.mediaDevices?.getUserMedia && window.isSecureContext)
}

// One photo: take one or pick from gallery. Shows a thumbnail with a remove button.
// value = File or null, onChange(file)
export default function PhotoInput({ value, onChange }) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [localError, setLocalError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)

  // thumbnail URL from the file, freed on change / unmount
  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : ''),
    [value],
  )
  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function handleFiles(fileList) {
    const file = fileList && fileList[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setLocalError('That file is not an image. Choose a photo (JPG, PNG, HEIC).')
      onChange(null)
      return
    }
    setLocalError('')
    onChange(file)
  }

  function openCamera() {
    if (shouldUseLiveCamera()) setCameraOpen(true)
    else cameraInputRef.current?.click()
  }

  function reset() {
    onChange(null)
    setLocalError('')
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  return (
    <div>
      {/* hidden inputs, opened by the buttons */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value && previewUrl ? (
        <div className="flex items-start gap-4 rounded-2xl bg-emerald-50/50 p-3 ring-1 ring-emerald-200">
          <img
            src={previewUrl}
            alt="Preview of the photo you selected"
            className="h-28 w-28 shrink-0 rounded-xl object-cover shadow"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{value.name}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {(value.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-slate-50"
            >
              <X size={15} aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={openCamera}
            className="group flex min-h-[44px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-sm font-semibold text-ink transition-colors hover:border-brand-400 hover:bg-brand-50/50"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:scale-110">
              <Camera size={20} aria-hidden="true" />
            </span>
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="group flex min-h-[44px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-sm font-semibold text-ink transition-colors hover:border-brand-400 hover:bg-brand-50/50"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:scale-110">
              <ImageUp size={20} aria-hidden="true" />
            </span>
            Upload from gallery
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-ink-soft">
        Your photo will be publicly visible. Please avoid photographing people,
        faces, or license plates.
      </p>

      {cameraOpen && (
        <CameraCapture
          onCapture={(file) => {
            setCameraOpen(false)
            setLocalError('')
            onChange(file)
          }}
          onClose={() => setCameraOpen(false)}
          onUploadInstead={() => {
            setCameraOpen(false)
            galleryInputRef.current?.click()
          }}
        />
      )}

      {localError && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-brand-700">
          {localError}
        </p>
      )}
    </div>
  )
}
