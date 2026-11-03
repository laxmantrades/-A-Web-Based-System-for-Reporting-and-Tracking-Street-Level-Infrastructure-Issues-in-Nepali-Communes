import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, Loader2, RefreshCw, RotateCcw, SwitchCamera, X } from 'lucide-react'

const JPEG_QUALITY = 0.9

function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow the camera in your browser’s address bar, then try again — or upload a photo instead.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device. You can upload a photo instead.'
    case 'NotReadableError':
      return 'Your camera is being used by another app. Close it and try again, or upload a photo instead.'
    default:
      return 'We could not start the camera. You can upload a photo instead.'
  }
}

// Camera inside the page for laptops (they ignore <input capture>).
// Shows preview -> take photo -> Retake or Use photo. Returns a JPEG File.
// Props: onCapture(file), onClose(), onUploadInstead()
export default function CameraCapture({ onCapture, onClose, onUploadInstead }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | live | captured | error
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState('environment')
  const [attempt, setAttempt] = useState(0) // changed by "Try again"
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [shot, setShot] = useState(null) // { file, url }

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // start (or restart) the camera
  useEffect(() => {
    if (shot) return undefined
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setStatus('live')
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (!cancelled) {
          setHasMultipleCameras(devices.filter((d) => d.kind === 'videoinput').length > 1)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(cameraErrorMessage(err))
        setStatus('error')
      })

    return () => {
      cancelled = true
      stopStream()
    }
  }, [facingMode, attempt, shot, stopStream])

  // free the preview URL
  useEffect(() => {
    if (!shot) return undefined
    return () => URL.revokeObjectURL(shot.url)
  }, [shot])

  // Esc closes, stop page scrolling while open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  function takePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const file = new File([blob], `photo-${stamp}.jpg`, { type: 'image/jpeg' })
        stopStream()
        setShot({ file, url: URL.createObjectURL(blob) })
        setStatus('captured')
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  }

  function retake() {
    setShot(null)
    setStatus('starting')
  }

  function retry() {
    setError('')
    setStatus('starting')
    setAttempt((n) => n + 1)
  }

  const ctrlBtn =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a photo"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-0 sm:p-6"
    >
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-900 shadow-2xl sm:h-auto sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <p className="text-sm font-semibold">
            {status === 'captured' ? 'Use this photo?' : 'Take a photo'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-black sm:aspect-video sm:flex-none">
          {status === 'captured' && shot ? (
            <img src={shot.url} alt="The photo you just took" className="max-h-full max-w-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`max-h-full max-w-full object-contain ${status === 'live' ? '' : 'invisible'}`}
            />
          )}

          {status === 'starting' && (
            <p className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-slate-300">
              <Loader2 className="animate-spin" aria-hidden="true" />
              Starting camera… allow access if your browser asks.
            </p>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="max-w-sm text-sm text-slate-200">{error}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={retry} className={`${ctrlBtn} bg-white/10 text-white hover:bg-white/20`}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Try again
                </button>
                <button type="button" onClick={onUploadInstead} className={`${ctrlBtn} bg-white text-slate-900 hover:bg-slate-100`}>
                  <ImageUp size={16} aria-hidden="true" />
                  Upload a photo instead
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 px-4 py-4">
          {status === 'captured' ? (
            <>
              <button type="button" onClick={retake} className={`${ctrlBtn} bg-white/10 text-white hover:bg-white/20`}>
                <RotateCcw size={16} aria-hidden="true" />
                Retake
              </button>
              <button
                type="button"
                onClick={() => onCapture(shot.file)}
                className={`${ctrlBtn} bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700`}
              >
                <Camera size={16} aria-hidden="true" />
                Use photo
              </button>
            </>
          ) : (
            <>
              <span className="w-11" aria-hidden="true" />
              <button
                type="button"
                onClick={takePhoto}
                disabled={status !== 'live'}
                aria-label="Take photo"
                className="grid h-16 w-16 place-items-center rounded-full bg-white ring-4 ring-white/30 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                <span className="h-12 w-12 rounded-full border-2 border-slate-900" />
              </button>
              {hasMultipleCameras && status === 'live' ? (
                <button
                  type="button"
                  onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                  aria-label="Switch camera"
                  className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <SwitchCamera size={20} aria-hidden="true" />
                </button>
              ) : (
                <span className="w-11" aria-hidden="true" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
