import { useState } from 'react'
import { MapPin, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LocationPicker({ onLocationSelect, initialLat, initialLng }) {
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState(initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null)

  const locate = () => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude, longitude } = p.coords
        setPos({ lat: latitude, lng: longitude })
        onLocationSelect(latitude, longitude)
        setLoading(false)
      },
      () => { alert('Accès à la géolocalisation refusé'); setLoading(false) },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" onClick={locate} disabled={loading} className="flex-1 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 h-10 rounded-lg text-sm font-medium">
          {loading ? <><LoaderCircle className="w-4 h-4 animate-spin mr-2" />Localisation...</> : <><MapPin className="w-4 h-4 mr-2" />Ma position</>}
        </Button>
        {pos && (
          <Button type="button" variant="outline" onClick={() => window.open(`https://www.google.com/maps/search/${pos.lat},${pos.lng}`, '_blank')} className="border-border text-foreground hover:bg-secondary h-10 rounded-lg text-sm font-medium">
            <MapPin className="w-4 h-4 mr-2" />Voir sur Map
          </Button>
        )}
      </div>
      {pos && (
        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground border border-border/50">
          📍 Position sélectionnée : {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
        </div>
      )}
    </div>
  )
}
