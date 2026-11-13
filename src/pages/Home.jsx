import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, CalendarDays, CalendarRange, LayoutGrid, ChevronRight, Search, Flame } from 'lucide-react'
import { api } from '@/api/client'
import EventCard from '@/components/EventCard'
import GeoSelector, { useGeoFilter, matchesGeo, geoLabel } from '@/components/GeoSelector'

const QUICK_FILTERS = [
  { id: 'today', label: "Aujourd'hui", icon: Calendar, color: 'text-chart-1' },
  { id: 'tomorrow', label: 'Demain', icon: CalendarDays, color: 'text-accent' },
  { id: 'weekend', label: 'Ce week-end', icon: CalendarRange, color: 'text-chart-3' },
  { id: 'all', label: 'Tout voir', icon: LayoutGrid, color: 'text-chart-4' },
]

/** Bornes de chaque filtre rapide, recalculées à chaque rendu. */
function dateWindow(id) {
  const now = new Date()
  const end = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  const start = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  if (id === 'today') return [now, end(now)]
  if (id === 'tomorrow') {
    const t = new Date(now); t.setDate(now.getDate() + 1)
    return [start(t), end(t)]
  }
  if (id === 'weekend') {
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7))
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1)
    return [start(sat), end(sun)]
  }
  return null
}

function QuickFilters({ active, onChange, counts }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_FILTERS.map(({ id, label, icon: Icon, color }) => {
        const n = counts[id]
        const empty = n === 0 && id !== 'all'
        return (
          <button
            key={id} onClick={() => onChange(id)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              active === id ? 'bg-primary/10 border-primary/40' : 'bg-card border-border/50 hover:border-primary/20'
            } ${empty ? 'opacity-50' : ''}`}
          >
            <span className="text-left min-w-0">
              <span className="block text-sm font-medium text-foreground truncate">{label}</span>
              <span className="block text-[11px] text-muted-foreground">
                {n === 0 ? 'rien de prévu' : `${n} événement${n > 1 ? 's' : ''}`}
              </span>
            </span>
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          </button>
        )
      })}
    </div>
  )
}

export default function Home() {
  const [filter, setFilter] = useState('all')
  const [geo, setGeo] = useGeoFilter()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 100),
  })

  // Événements à venir, dans la zone choisie.
  const local = useMemo(() => {
    const now = new Date()
    return events
      .filter((e) => e.status !== 'annule' && new Date(e.date) >= now && matchesGeo(e, geo))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [events, geo])

  const inWindow = (e, id) => {
    const w = dateWindow(id)
    if (!w) return true
    const d = new Date(e.date)
    return d >= w[0] && d <= w[1]
  }

  const counts = useMemo(() => ({
    today: local.filter((e) => inWindow(e, 'today')).length,
    tomorrow: local.filter((e) => inWindow(e, 'tomorrow')).length,
    weekend: local.filter((e) => inWindow(e, 'weekend')).length,
    all: local.length,
  }), [local])

  const filtered = local.filter((e) => inWindow(e, filter))
  const featured = local.filter((e) => e.is_featured)

  // « Tendances » : les plus réservés parmi ceux qui ne sont pas déjà à la une.
  const trending = useMemo(() => {
    const featuredIds = new Set(featured.map((e) => e.id))
    return local
      .filter((e) => !featuredIds.has(e.id) && (e.tickets_sold || 0) > 0)
      .sort((a, b) => (b.tickets_sold || 0) / (b.tickets_available || 1) - (a.tickets_sold || 0) / (a.tickets_available || 1))
      .slice(0, 4)
  }, [local, featured])

  const scope = geo.city || geo.country

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Kel Bail</h1>
          <div className="flex items-center gap-3">
            <GeoSelector events={events} geo={geo} onChange={setGeo} />
            <Link to="/recherche" className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Rechercher">
              <Search className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-7">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground leading-tight mb-1">Trouve ton prochain événement</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {scope ? `${local.length} événement${local.length > 1 ? 's' : ''} à ${geoLabel(geo)}` : 'Partout en Afrique de l’Ouest'}
          </p>
          <QuickFilters active={filter} onChange={setFilter} counts={counts} />
        </div>

        {featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-foreground">À la une</h3>
              <Link to="/recherche" className="text-sm text-primary flex items-center gap-0.5 hover:underline">
                Voir tout <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {featured.map((e) => (
                <div key={e.id} className="snap-start"><EventCard event={e} size="large" /></div>
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && filter === 'all' && (
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent" />Ça se remplit
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {trending.map((e) => (
                <div key={e.id} className="snap-start"><EventCard event={e} size="large" showTrending /></div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-lg font-bold text-foreground mb-3">
            {filter === 'all' ? 'Tous les événements' : QUICK_FILTERS.find((f) => f.id === filter).label}
            {scope && <span className="text-muted-foreground font-medium text-sm"> · {geoLabel(geo)}</span>}
          </h3>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-card rounded-2xl h-64 border border-border/50" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-muted-foreground">
                {scope ? `Rien de prévu à ${geoLabel(geo)} pour ce créneau` : 'Aucun événement pour le moment'}
              </p>
              <div className="flex flex-col items-center gap-2 mt-4">
                {filter !== 'all' && (
                  <button onClick={() => setFilter('all')} className="text-sm text-primary font-semibold hover:underline">
                    Voir toutes les dates
                  </button>
                )}
                {scope && (
                  <button onClick={() => setGeo({ country: '', city: '' })} className="text-sm text-primary font-semibold hover:underline">
                    Chercher partout
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">{filtered.map((e) => <EventCard key={e.id} event={e} />)}</div>
          )}
        </section>
      </main>
    </div>
  )
}
