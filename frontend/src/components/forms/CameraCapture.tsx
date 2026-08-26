import { useId, useRef, useState, useEffect } from 'react'

interface CameraCaptureProps {
  label: string
  value: File | null
  onChange: (file: File | null) => void
  error?: string
  /** Pass the same id as a wrapping FormField's `htmlFor` so the label is actually associated with this input. */
  id?: string
}

/**
 * Captures a photo via the device camera using a native file input with
 * `capture="environment"` — permission-prompt only, no getUserMedia
 * plumbing needed, works reliably across mobile browsers (CLAUDE.md §9).
 */
export function CameraCapture({ label, value, onChange, error, id: idProp }: CameraCaptureProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-lg border-2 border-brand-700 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          {value ? `Retake ${label}` : `Take photo — ${label}`}
        </button>
        {previewUrl && (
          <img src={previewUrl} alt={`${label} preview`} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
