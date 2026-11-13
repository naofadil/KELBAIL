import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, X, SlidersHorizontal, Check } from 'lucide-react'
import { api } from '@/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import EventCard from '@/components/EventCard'
import { SEARCH_CATEGORIES } from '@/lib/utils'
import { COUNTRIES, eventCountry, countryFlag, normalize } from '@/lib/geo'
import { useGeoFilter } from '@/components/GeoSelector'

const PERIODS = [
  { value: 'all', label: 'Toutes les dates' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'weekend', label: 'Ce week-end' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois-ci' },
]

const SORTS = [
  { value: 'date', label: 'Date (du plus proche)' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'popular', label: 'Popularité' },
]

const PRICE_STEPS = [0, 2000, 5000, 10000, 20000, Infinity]

/** Un événement tombe-t-il dans la période demandée ? */
function inPeriod(event, period) {
  if (period === 'all') return true
  const d = new Date(event.date)
  const now = new Date()
  const endOfDay = (x) => { const y = new Date(x); y.setHours(23, 59, 59, 999); return y }
  if (period === 'today') return d >= now && d <= endOfDay(now)
  if (period === 'weekend') {
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7)); sat.setHours(0, 0, 0, 0)
    const sun = endOfDay(new Date(sat.getTime() + 86400000))
    return d >= sat && d <= sun
  }
  if (period === 'week') {
    const in7 = new Date(now); in7.setDate(now.getDate() + 7)
    return d >= now && d <= endOfDay(in7)
  }
  if (period === 'month') {
    const in30 = new Date(now); in30.setDate(now.getDate() + 30)
    return d >= now && d <= endOfDay(in30)
  }
  return true
}

export default function Search() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [geo, setGeo] = useGeoFilter()
  const [period, setPeriod] = useState('all')
  const [maxPrice, setMaxPrice] = useState(Infinity)
  const [sort, setSort] = useState('date')
  const [includePast, setIncludePast] = useState(false)
  const [sheet, setSheet] = useState(false)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 200),
  })

  const citiesOfCountry = useMemo(() => {
    if (!geo.country) return []
    return [...new Set(events.filter((e) => eventCountry(e) === geo.country).map((e) => e.city))].sort()
  }, [events, geo.country])

  const results = useMemo(() => {
    const term = normalize(q)
    const now = new Date()
    const list = events.filter((e) => {
      if (e.status === 'annule') return false
      if (!includePast && new Date(e.date) < now) return false
      if (term) {
        const haystack = normalize(`${e.title} ${e.city} ${e.location} ${e.organizer_name} ${eventCountry(e)}`)
        if (!haystack.includes(term)) return false
      }
      if (category !== 'all' && e.category !== category) return false
      if (geo.country && eventCountry(e) !== geo.country) return false
      if (geo.city && e.city !== geo.city) return false
      if (Number.isFinite(maxPrice) && (e.ticket_price || 0) > maxPrice) return false
      if (!inPeriod(e, period)) return false
      return true
    })
    const byDate = (a, b) => new Date(a.date) - new Date(b.date)
    if (sort === 'price_asc') return list.sort((a, b) => (a.ticket_price || 0) - (b.ticket_price || 0) || byDate(a, b))
    if (sort === 'price_desc') return list.sort((a, b) => (b.ticket_price || 0) - (a.ticket_price || 0) || byDate(a, b))
    if (sort === 'popular') return list.sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0) || byDate(a, b))
    return list.sort(byDate)
  }, [events, q, category, geo, maxPrice, period, sort, includePast])

  const activeCount =
    (geo.country ? 1 : 0) + (geo.city ? 1 : 0) + (period !== 'all' ? 1 : 0)
    + (Number.isFinite(maxPrice) ? 1 : 0) + (sort !== 'date' ? 1 : 0) + (includePast ? 1 : 0)

  const reset = () => {
    setGeo({ country: '', city: '' }); setPeriod('all'); setMaxPrice(Infinity)
    setSort('date'); setIncludePast(false); setCategory('all')
  }

  const chips = [
    geo.country && { label: `${countryFlag(geo.country)} ${geo.country}`, clear: () => setGeo({ country: '', city: '' }) },
    geo.city && { label: geo.city, clear: () => setGeo({ country: geo.country, city: '' }) },
    period !== 'all' && { label: PERIODS.find((p) => p.value === period).label, clear: () => setPeriod('all') },
    Number.isFinite(maxPrice) && { label: `≤ ${maxPrice.toLocaleString('fr-FR')} F`, clear: () => setMaxPrice(Infinity) },
    sort !== 'date' && { label: SORTS.find((s) => s.value === sort).label, clear: () => setSort('date') },
    includePast && { label: 'Événements passés inclus', clear: () => setIncludePast(false) },
  ].filter(Boolean)

  const Option = ({ active, children, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
        active ? 'bg-primary/10 border-primary/40 text-foreground' : 'bg-secondary/40 border-border/50 text-muted-foreground hover:border-primary/20'
      }`}
    >
      <span className="truncate">{children}</span>
      {active && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Événement, lieu, ville, organisateur..."
                className="pl-11 pr-10 h-11 bg-secondary border-border text-foreground rounded-xl"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3.5 top-1/2 -translate-y-1/2" aria-label="Effacer">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <button
              onClick={() => setSheet(true)}
              className={`relative h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${
                activeCount ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border text-muted-foreground'
              }`}
              aria-label="Filtres"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {SEARCH_CATEGORIES.map((c) => (
              <button
                key={c.value} onClick={() => setCategory(c.value)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  category === c.value ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-card border-border/50 text-muted-foreground hover:border-primary/20'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {chips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {chips.map((c, i) => (
                <button
                  key={i} onClick={c.clear}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium"
                >
                  {c.label}<X className="w-3 h-3" />
                </button>
              ))}
              <button onClick={reset} className="flex-shrink-0 px-3 py-1 text-xs text-muted-foreground hover:text-foreground underline">
                Tout effacer
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        {!isLoading && (
          <p className="text-xs text-muted-foreground mb-3">
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </p>
        )}
        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-card rounded-2xl h-64 border border-border/50" />)}</div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-muted-foreground">Aucun résultat trouvé</p>
            {activeCount > 0 && (
              <Button variant="outline" onClick={reset} className="mt-4 border-border text-foreground hover:bg-secondary rounded-xl">
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">{results.map((e) => <EventCard key={e.id} event={e} />)}</div>
        )}
      </main>

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Filtrer</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {results.length} événement{results.length > 1 ? 's' : ''} correspondent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pays</p>
              <div className="space-y-1.5">
                <Option active={!geo.country} onClick={() => setGeo({ country: '', city: '' })}>🌍 Tous les pays</Option>
                {COUNTRIES.filter((c) => events.some((e) => eventCountry(e) === c.name)).map((c) => (
                  <Option key={c.code} active={geo.country === c.name} onClick={() => setGeo({ country: c.name, city: '' })}>
                    {c.flag} {c.name}
                  </Option>
                ))}
              </div>
            </div>

            {citiesOfCountry.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ville</p>
                <div className="space-y-1.5">
                  <Option active={!geo.city} onClick={() => setGeo({ country: geo.country, city: '' })}>Toutes les villes</Option>
                  {citiesOfCountry.map((city) => (
                    <Option key={city} active={geo.city === city} onClick={() => setGeo({ country: geo.country, city })}>{city}</Option>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quand</p>
              <div className="space-y-1.5">
                {PERIODS.map((p) => (
                  <Option key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>{p.label}</Option>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Prix maximum</p>
              <div className="flex flex-wrap gap-2">
                {PRICE_STEPS.map((p) => (
                  <button
                    key={String(p)} onClick={() => setMaxPrice(p === 0 ? 0 : p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      maxPrice === p ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border/50 text-muted-foreground'
                    }`}
                  >
                    {p === 0 ? 'Gratuit' : p === Infinity ? 'Tous les prix' : `≤ ${p.toLocaleString('fr-FR')} F`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Trier par</p>
              <div className="space-y-1.5">
                {SORTS.map((s) => (
                  <Option key={s.value} active={sort === s.value} onClick={() => setSort(s.value)}>{s.label}</Option>
                ))}
              </div>
            </div>

            <Option active={includePast} onClick={() => setIncludePast(!includePast)}>
              Inclure les événements passés
            </Option>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={reset} className="flex-1 border-border text-foreground hover:bg-secondary h-11 rounded-xl">
              Réinitialiser
            </Button>
            <Button onClick={() => setSheet(false)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold">
              Voir les résultats
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
