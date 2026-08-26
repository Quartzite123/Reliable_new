import { useRef, useState } from 'react'

interface SignatureFieldProps {
  label: string
  onChange: (dataUrl: string | null) => void
}

/** Simple canvas-based signature pad for supervisor sign-off (Harvest/Weighing, if supported by the API). */
export function SignatureField({ label, onChange }: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getContext = () => canvasRef.current?.getContext('2d') ?? null

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const ctx = getContext()
    const { x, y } = pointFromEvent(e)
    ctx?.beginPath()
    ctx?.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = getContext()
    const { x, y } = pointFromEvent(e)
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const end = () => {
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-800">{label}</p>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="w-full touch-none rounded-lg border border-gray-300 bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      {hasSignature && (
        <button type="button" onClick={clear} className="mt-2 text-sm font-medium text-brand-700 underline">
          Clear signature
        </button>
      )}
    </div>
  )
}
