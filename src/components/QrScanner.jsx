import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Scanner caméra (API BarcodeDetector quand disponible, sinon message).
 * Ajout par rapport à l'original qui ne proposait que la saisie manuelle.
 */
export default function QrScanner({ onDetected, disabled }) {
  const videoRef = useRef(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!active) return
    let stream, raf, detector, cancelled = false
    const start = async () => {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const tick = async () => {
          if (cancelled) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length && !disabled) {
              onDetected(codes[0].rawValue)
              setActive(false)
              return
            }
          } catch { /* frame non prête */ }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        setError("Impossible d'accéder à la caméra")
        setActive(false)
      }
    }
    start()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active, disabled, onDetected])

  if (!supported) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-4 text-xs text-muted-foreground flex items-center gap-2">
        <CameraOff className="w-4 h-4 flex-shrink-0" />Scan caméra non pris en charge par ce navigateur. Utilise la saisie manuelle.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {active ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/40 bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute inset-8 border-2 border-primary rounded-xl pointer-events-none" />
        </div>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="button" variant="outline" onClick={() => { setError(''); setActive(!active) }} className="w-full border-border text-foreground hover:bg-secondary h-11 rounded-xl font-semibold flex items-center justify-center gap-2">
        {active ? <><CameraOff className="w-4 h-4" />Arrêter la caméra</> : <><Camera className="w-4 h-4" />Scanner avec la caméra</>}
      </Button>
    </div>
  )
}
