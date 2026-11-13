import { Link } from 'react-router-dom'
import { MapPin, Calendar, Ticket, Users, Flame } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { categoryLabel, eventStatus, relativeDay, compact } from '@/lib/utils'
import { eventCountry, countryFlag } from '@/lib/geo'

const TONE = {
  destructive: 'bg-destructive/90 text-destructive-foreground',
  accent: 'bg-accent/90 text-accent-foreground',
  muted: 'bg-muted text-muted-foreground',
}

export default function EventCard({ event, size = 'normal', showTrending = false }) {
  const large = size === 'large'
  const status = eventStatus(event)
  const country = eventCountry(event)
  const soon = relativeDay(event.date)
  const going = event.tickets_sold || 0

  return (
    <Link to={`/evenement/${event.id}`} className={`block group ${large ? 'w-72 flex-shrink-0' : 'w-full'}`}>
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/50 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]">
        <div className={`relative ${large ? 'h-44' : 'h-48'} overflow-hidden`}>
          {event.poster_url ? (
            <img
              src={event.poster_url} alt={event.title} loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${status.past || status.key === 'cancelled' ? 'grayscale opacity-60' : ''}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <Ticket className="w-12 h-12 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {status.label && (
            <div className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${TONE[status.tone]}`}>
              {status.label}
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="bg-primary/90 text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
              {categoryLabel(event.category)}
            </span>
            {showTrending && (
              <span className="bg-background/80 backdrop-blur-sm text-accent text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3" />Tendance
              </span>
            )}
          </div>

          {soon && !status.past && (
            <span className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
              {soon}
            </span>
          )}
        </div>

        <div className="p-3.5">
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 mb-2">{event.title}</h3>

          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{event.location}, {event.city}</span>
            {country && <span className="flex-shrink-0" title={country}>{countryFlag(country)}</span>}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-accent text-xs font-medium min-w-0">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {event.date ? format(new Date(event.date), 'EEE d MMM à HH:mm', { locale: fr }) : 'Date à confirmer'}
              </span>
            </div>
            <span className="text-primary font-bold text-sm flex-shrink-0">
              {event.ticket_price ? `${event.ticket_price.toLocaleString('fr-FR')} F CFA` : 'Gratuit'}
            </span>
          </div>

          {going >= 20 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
              <Users className="w-3.5 h-3.5" />
              <span><span className="text-foreground font-semibold">{compact(going)}</span> personnes y vont</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
