import { useMemo, useState } from 'react'
import { MapPin, Check, ChevronLeft, Globe } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { COUNTRIES, eventCountry, countryFlag } from '@/lib/geo'

const STORAGE_KEY = 'kelbail_geo'

/**
 * Filtre géographique courant, mémorisé entre les sessions.
 * `{ country: '', city: '' }` signifie « partout ».
 */
export function useGeoFilter() {
  const [geo, setGeoState] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (raw && typeof raw === 'object') return { country: raw.country || '', city: raw.city || '' }
    } catch { /* valeur illisible */ }
    return { country: '', city: '' }
  })
  const setGeo = (next) => {
    const value = { country: next.country || '', city: next.city || '' }
    setGeoState(value)
    try {
      if (value.country || value.city) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* stockage indisponible */ }
  }
  return [geo, setGeo]
}

/** Un événement passe-t-il le filtre géographique ? */
export function matchesGeo(event, geo) {
  if (!geo?.country && !geo?.city) return true
  if (geo.city) return event.city === geo.city
  return eventCountry(event) === geo.country
}

/** Libellé compact du filtre, affiché dans l'en-tête. */
export function geoLabel(geo) {
  if (geo?.city) return geo.city
  if (geo?.country) return geo.country
  return 'Partout'
}

export default function GeoSelector({ events = [], geo, onChange }) {
  const [open, setOpen] = useState(false)
  const [browsing, setBrowsing] = useState(null) // pays dont on liste les villes

  const live = useMemo(() => events.filter((e) => e.status !== 'annule'), [events])

  // Comptage par pays et par ville, limité aux pays qui ont au moins un événement.
  const { byCountry, byCity } = useMemo(() => {
    const c = {}
    const city = {}
    live.forEach((e) => {
      const country = eventCountry(e)
      if (country) c[country] = (c[country] || 0) + 1
      if (e.city) {
        city[e.city] = city[e.city] || { count: 0, country }
        city[e.city].count += 1
      }
    })
    return { byCountry: c, byCity: city }
  }, [live])

  const countries = COUNTRIES.filter((c) => byCountry[c.name]).sort(
    (a, b) => byCountry[b.name] - byCountry[a.name],
  )

  const citiesOf = (countryName) => Object.entries(byCity)
    .filter(([, v]) => v.country === countryName)
    .sort((a, b) => b[1].count - a[1].count)

  const choose = (next) => { onChange(next); setOpen(false); setBrowsing(null) }

  const Row = ({ icon, label, count, active, onClick, chevron }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
        active ? 'bg-primary/10 border-primary/40' : 'bg-secondary/40 border-border/50 hover:border-primary/20'
      }`}
    >
      <span className="flex items-center gap-2.5 text-sm font-medium text-foreground min-w-0">
        <span className="text-base leading-none flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
        {count != null && <span>{count}</span>}
        {active && <Check className="w-4 h-4 text-primary" />}
        {chevron && <span className="text-muted-foreground/60">›</span>}
      </span>
    </button>
  )

  return (
    <>
      <button
        onClick={() => { setBrowsing(geo?.country || null); setOpen(true) }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[40vw]"
        aria-label="Changer de lieu"
      >
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="truncate">{geoLabel(geo)}</span>
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setBrowsing(null) }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {browsing && (
                <button onClick={() => setBrowsing(null)} className="text-muted-foreground hover:text-foreground" aria-label="Retour aux pays">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {browsing ? `${countryFlag(browsing)} ${browsing}` : 'Où sors-tu ?'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {browsing ? 'Choisis une ville ou garde tout le pays' : 'Filtre les événements par pays puis par ville'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 mt-2 max-h-[55vh] overflow-y-auto">
            {!browsing ? (
              <>
                <Row
                  icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                  label="Partout" count={live.length}
                  active={!geo.country && !geo.city}
                  onClick={() => choose({ country: '', city: '' })}
                />
                {countries.map((c) => (
                  <Row
                    key={c.code} icon={c.flag} label={c.name} count={byCountry[c.name]}
                    active={geo.country === c.name && !geo.city}
                    onClick={() => setBrowsing(c.name)}
                    chevron
                  />
                ))}
              </>
            ) : (
              <>
                <Row
                  icon={countryFlag(browsing)} label={`Tout le pays`} count={byCountry[browsing]}
                  active={geo.country === browsing && !geo.city}
                  onClick={() => choose({ country: browsing, city: '' })}
                />
                {citiesOf(browsing).map(([city, v]) => (
                  <Row
                    key={city} icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                    label={city} count={v.count}
                    active={geo.city === city}
                    onClick={() => choose({ country: browsing, city })}
                  />
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
