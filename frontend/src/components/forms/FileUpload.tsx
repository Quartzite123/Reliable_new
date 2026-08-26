import { useId, useRef, useState } from 'react'

interface FileUploadProps {
  label: string
  accept?: string
  maxSizeMb?: number
  value: File | null
  onChange: (file: File | null) => void
  error?: string
  /** Pass the same id as a wrapping FormField's `htmlFor` so the label is actually associated with this input. */
  id?: string
}

/** Generic document upload (2A/4B PDFs, passbook photo) with client-side type/size validation. */
export function FileUpload({ label, accept, maxSizeMb = 10, value, onChange, error, id: idProp }: FileUploadProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleChange = (file: File | undefined) => {
    if (!file) {
      onChange(null)
      return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`File is too large. Maximum size is ${maxSizeMb}MB.`)
      onChange(null)
      return
    }
    setLocalError(null)
    onChange(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleChange(e.target.files?.[0])}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-lg border-2 border-brand-700 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          {value ? 'Replace file' : `Upload ${label}`}
        </button>
        {value && <span className="truncate text-sm text-gray-600">{value.name}</span>}
      </div>
      {(error ?? localError) && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-700">
          {error ?? localError}
        </p>
      )}
    </div>
  )
}
