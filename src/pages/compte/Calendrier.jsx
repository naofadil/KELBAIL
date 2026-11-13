import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, MapPin, Ticket, Heart } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '@/api/client'
import SubPageHeader from '@/components/SubPageHeader'
import { useRequireAuth } from '@/hooks/useAuth'

function downloadIcs(event) {
  const start = new Date(event.date)
  const end = new Date(start.getTime() + 3 * 3600 * 1000)
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kel Bail//FR', 'BEGIN:VEVENT', `UID:${event.id}@kelbail`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${event.title}`, `LOCATION:${event.location}, ${event.city}`, `DESCRIPTION:${(event.description || '').replace(/\n/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${event.title}.ics` })
  a.click(); URL.revokeObjectURL(url)
}

/** Calendrier : événements à venir issus des billets achetés et des favoris. */
export default function Calendrier() {
  const { user } = useRequireAuth()
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 100) })
  const { data: tickets = [] } = useQuery({ queryKey: ['myTickets', user?.email], queryFn: () => api.entities.Ticket.filter({ buyer_email: user.email }), enabled: !!user?.email })
  const { data: favorites = [] } = useQuery({ queryKey: ['favorites', user?.email], queryFn: () => api.entities.Favorite.filter({ user_email: user.email }), enabled: !!user?.email })

  const agenda = useMemo(() => {
    const ticketIds = new Set(tickets.filter((t) => t.status !== 'annule').map((t) => t.event_id))
    const favIds = new Set(favorites.map((f) => f.event_id))
    return events
      .filter((e) => (ticketIds.has(e.id) || favIds.has(e.id)) && e.status !== 'annule')
      .map((e) => ({ ...e, hasTicket: ticketIds.has(e.id), isFav: favIds.has(e.id) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [events, tickets, favorites])

  const now = new Date()
  const upcoming = agenda.filter((e) => new Date(e.date) >= now)
  const past = agenda.filter((e) => new Date(e.date) < now)
  const byMonth = upcoming.reduce((acc, e) => { const k = format(new Date(e.date), 'MMMM yyyy', { locale: fr }); (acc[k] ||= []).push(e); return acc }, {})

  if (!user) return null
  const Row = ({ e }) => {
    const d = new Date(e.date)
    const today = isSameDay(d, now)
    return (
      <div className="flex gap-3">
        <div className={`w-14 flex-shrink-0 rounded-xl border p-2 text-center ${today ? 'bg-primary/15 border-primary/40' : 'bg-card border-border/50'}`}>
          <p className="text-[10px] uppercase text-muted-foreground">{format(d, 'EEE', { locale: fr })}</p>
          <p className={`text-xl font-extrabold ${today ? 'text-primary' : 'text-foreground'}`}>{format(d, 'd')}</p>
          <p className="text-[10px] text-muted-foreground">{format(d, 'HH:mm')}</p>
        </div>
        <Link to={`/evenement/${e.id}`} className="flex-1 bg-card border border-border/50 rounded-xl p-3 hover:border-primary/30 transition-colors min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm line-clamp-1">{e.title}</h3>
            <div className="flex gap-1 flex-shrink-0">{e.hasTicket && <Ticket className="w-3.5 h-3.5 text-primary" />}{e.isFav && <Heart className="w-3.5 h-3.5 text-destructive fill-destructive" />}</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}, {e.city}</p>
          <button onClick={(ev) => { ev.preventDefault(); downloadIcs(e) }} className="mt-2 text-xs text-primary font-medium flex items-center gap-1 hover:underline"><CalendarPlus className="w-3.5 h-3.5" />Ajouter à mon agenda</button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <SubPageHeader title="Ton calendrier" subtitle="Tes événements à venir" />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {agenda.length === 0 ? (
          <div className="text-center py-12"><p className="text-4xl mb-3">📅</p><p className="text-muted-foreground">Aucun événement dans ton calendrier.</p><p className="text-xs text-muted-foreground mt-1">Achète un billet ou ajoute un événement à tes favoris pour le voir ici.</p><Link to="/" className="inline-block mt-4 text-sm text-primary font-semibold hover:underline">Découvrir les événements</Link></div>
        ) : (
          <>
            {Object.entries(byMonth).map(([month, list]) => (
              <section key={month}><h2 className="text-sm font-bold text-foreground capitalize mb-3">{month}</h2><div className="space-y-3">{list.map((e) => <Row key={e.id} e={e} />)}</div></section>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground text-center">Aucun événement à venir.</p>}
            {past.length > 0 && <section><h2 className="text-sm font-bold text-muted-foreground mb-3">Passés</h2><div className="space-y-3 opacity-60">{past.map((e) => <Row key={e.id} e={e} />)}</div></section>}
          </>
        )}
      </main>
    </div>
  )
}
