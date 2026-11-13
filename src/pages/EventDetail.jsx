import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Heart, Share2, Calendar, MapPin, Users, MessageSquare,
  BellRing, BellOff, CircleCheck, Clock, UserPlus, UserCheck,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import PurchaseDialog from '@/components/PurchaseDialog'
import { useCurrentUser } from '@/hooks/useAuth'
import { categoryLabel, eventStatus, relativeDay, compact } from '@/lib/utils'
import { eventCountry, countryFlag } from '@/lib/geo'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [buying, setBuying] = useState(false)
  const { data: user } = useCurrentUser()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id], queryFn: async () => (await api.entities.Event.filter({ id }))[0], enabled: !!id,
  })
  const { data: favorite } = useQuery({
    queryKey: ['favorite', id, user?.email],
    queryFn: async () => (await api.entities.Favorite.filter({ event_id: id, user_email: user.email }))[0] || null,
    enabled: !!user?.email && !!id,
  })
  const { data: waitlisted } = useQuery({
    queryKey: ['waitlist', id, user?.email],
    queryFn: async () => (await api.entities.Waitlist.filter({ event_id: id, user_email: user.email }))[0] || null,
    enabled: !!user?.email && !!id,
  })
  const { data: following } = useQuery({
    queryKey: ['follow', event?.organizer_email, user?.email],
    queryFn: async () => (await api.entities.Follow.filter({ organizer_email: event.organizer_email, user_email: user.email }))[0] || null,
    enabled: !!user?.email && !!event?.organizer_email,
  })
  const { data: myTickets = [] } = useQuery({
    queryKey: ['myTicketsForEvent', id, user?.email],
    queryFn: () => api.entities.Ticket.filter({ event_id: id, buyer_email: user.email }),
    enabled: !!user?.email && !!id,
  })

  const needsLogin = (action) => {
    toast.info(`Connecte-toi pour ${action}`)
    api.auth.redirectToLogin(`/evenement/${id}`)
  }

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favorite) await api.entities.Favorite.delete(favorite.id)
      else await api.entities.Favorite.create({ event_id: id, user_email: user.email })
      return !favorite
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ['favorite', id] })
      qc.invalidateQueries({ queryKey: ['favorites'] })
      toast.success(added ? 'Ajouté à tes favoris ❤️' : 'Retiré des favoris')
    },
  })

  const toggleWaitlist = useMutation({
    mutationFn: async () => {
      if (waitlisted) { await api.ops.leaveWaitlist(id); return false }
      await api.ops.joinWaitlist(id); return true
    },
    onSuccess: (joined) => {
      qc.invalidateQueries({ queryKey: ['waitlist', id] })
      toast.success(joined
        ? 'Tu es sur la liste d’attente. On te prévient si une place se libère.'
        : 'Tu as quitté la liste d’attente.')
    },
    onError: (e) => toast.error(e.message),
  })

  const toggleFollow = useMutation({
    mutationFn: () => api.ops.toggleFollow(event.organizer_email),
    onSuccess: (now) => {
      qc.invalidateQueries({ queryKey: ['follow'] })
      toast.success(now
        ? `Tu suis ${event.organizer_name}. Tu seras prévenu de ses prochains événements.`
        : `Tu ne suis plus ${event.organizer_name}.`)
    },
    onError: (e) => toast.error(e.message),
  })

  const purchase = useMutation({
    mutationFn: (d) => api.ops.purchase({
      eventId: id, quantity: d.quantity, buyerName: d.buyerName, operator: d.operator, ussdCode: d.ussdCode,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['myTickets'] })
      qc.invalidateQueries({ queryKey: ['myTicketsForEvent', id] })
    },
  })

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: `${event.title} — ${event.location}, ${event.city}`, url }) } catch { /* annulé */ }
    } else {
      navigator.clipboard?.writeText(url)
      toast.success('Lien copié !')
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
  }
  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">Événement introuvable</p>
        <Link to="/" className="text-primary font-semibold hover:underline">Retour à l'accueil</Link>
      </div>
    )
  }

  const status = eventStatus(event)
  const country = eventCountry(event)
  const soon = relativeDay(event.date)
  const sold = event.tickets_sold || 0
  const fill = event.tickets_available ? Math.min(100, Math.round((sold / event.tickets_available) * 100)) : 0
  const owned = myTickets.filter((t) => t.status !== 'annule').reduce((s, t) => s + t.quantity, 0)
  const buyable = status.key === 'open' || status.key === 'filling' || status.key === 'last'

  const openMap = () => {
    const q = event.latitude && event.longitude
      ? `${event.latitude},${event.longitude}`
      : encodeURIComponent(`${event.location}, ${event.city}, ${country}`)
    window.open(`https://www.google.com/maps/search/${q}`, '_blank')
  }

  return (
    <div className="min-h-screen">
      <div className="relative h-72 sm:h-80">
        {event.poster_url
          ? <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/90 transition-colors" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => (user ? toggleFavorite.mutate() : needsLogin('enregistrer cet événement'))}
              className="w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center hover:bg-background/90 transition-colors"
              aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-5 h-5 ${favorite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
            </button>
            <button onClick={share} className="w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/90 transition-colors" aria-label="Partager">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 -mt-8 relative z-10 pb-32">
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-block bg-primary/15 text-primary text-xs font-semibold px-3 py-1 rounded-full capitalize">
                {categoryLabel(event.category)}
              </span>
              {soon && <span className="inline-block bg-secondary text-foreground text-xs font-semibold px-3 py-1 rounded-full">{soon}</span>}
              {status.label && (
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                  status.tone === 'destructive' ? 'bg-destructive/15 text-destructive'
                    : status.tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
                }`}>{status.label}</span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-foreground leading-tight">{event.title}</h1>
          </div>

          {owned > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-2.5">
              <CircleCheck className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-primary flex-1">Tu as déjà {owned} billet{owned > 1 ? 's' : ''} pour cet événement.</p>
              <Link to="/billets" className="text-xs font-semibold text-primary underline flex-shrink-0">Voir</Link>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm first-letter:uppercase">
                  {event.date ? format(new Date(event.date), 'EEEE d MMMM yyyy', { locale: fr }) : 'Date à confirmer'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.date ? `à ${format(new Date(event.date), 'HH:mm', { locale: fr })}` : ''}
                </p>
              </div>
            </div>

            <button onClick={openMap} className="w-full flex items-center gap-3 text-foreground hover:bg-secondary/30 transition-colors rounded-lg p-2 -mx-2">
              <div className="w-10 h-10 rounded-xl bg-chart-4/15 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-chart-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-sm truncate">{event.location}</p>
                <p className="text-xs text-muted-foreground">{event.city}{country ? ` · ${countryFlag(country)} ${country}` : ''}</p>
                <p className="text-xs text-chart-4 font-medium mt-0.5">Voir l'itinéraire</p>
              </div>
            </button>

            <div className="flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {status.remaining > 0 ? `${status.remaining} places restantes` : 'Complet'}
                  {sold >= 20 && <span className="text-muted-foreground font-normal"> · {compact(sold)} personnes y vont</span>}
                </p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${fill >= 90 ? 'bg-destructive' : fill >= 70 ? 'bg-accent' : 'bg-primary'}`}
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{sold} / {event.tickets_available} billets vendus</p>
              </div>
            </div>
          </div>

          {event.description && (
            <div>
              <h3 className="font-bold text-foreground mb-2">À propos</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {event.organizer_name && (
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Organisé par</p>
                  <p className="font-semibold text-foreground truncate">{event.organizer_name}</p>
                </div>
                {event.organizer_email && user?.email !== event.organizer_email && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => (user ? toggleFollow.mutate() : needsLogin('suivre cet organisateur'))}
                    className={`flex-shrink-0 h-9 rounded-lg text-xs font-semibold ${
                      following ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-foreground'
                    }`}
                  >
                    {following ? <><UserCheck className="w-4 h-4 mr-1.5" />Suivi</> : <><UserPlus className="w-4 h-4 mr-1.5" />Suivre</>}
                  </Button>
                )}
              </div>
              {event.organizer_email && user?.email !== event.organizer_email && (
                <button
                  onClick={() => (user ? navigate(`/compte/conversations?event=${id}`) : needsLogin("contacter l'organisateur"))}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/60 text-foreground hover:bg-secondary text-xs font-semibold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />Poser une question
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            Billet nominatif, limité à 10 par personne et valable une seule fois.
            Remboursement uniquement en cas d'annulation par l'organisateur.
          </p>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-primary truncate">
              {event.ticket_price ? event.ticket_price.toLocaleString('fr-FR') : 'Gratuit'}
              {event.ticket_price ? <span className="text-sm font-semibold"> F CFA</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">par billet</p>
          </div>

          {buyable ? (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-xl text-base font-bold flex-shrink-0"
              onClick={() => (user ? setBuying(true) : needsLogin('acheter un billet'))}
            >
              Acheter
            </Button>
          ) : status.key === 'soldout' ? (
            <Button
              variant="outline"
              onClick={() => (user ? toggleWaitlist.mutate() : needsLogin("rejoindre la liste d'attente"))}
              disabled={toggleWaitlist.isPending}
              className={`h-12 px-5 rounded-xl text-sm font-bold flex-shrink-0 ${
                waitlisted ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-foreground'
              }`}
            >
              {waitlisted ? <><BellOff className="w-4 h-4 mr-2" />Quitter la liste</> : <><BellRing className="w-4 h-4 mr-2" />Préviens-moi</>}
            </Button>
          ) : (
            <Button disabled className="h-12 px-8 rounded-xl text-base font-bold flex-shrink-0">
              {status.key === 'cancelled' ? 'Annulé' : <><Clock className="w-4 h-4 mr-2" />Terminé</>}
            </Button>
          )}
        </div>
      </div>

      <PurchaseDialog
        open={buying} onOpenChange={setBuying} event={event}
        defaultName={user?.full_name || ''} onConfirm={(d) => purchase.mutateAsync(d)}
      />
    </div>
  )
}
