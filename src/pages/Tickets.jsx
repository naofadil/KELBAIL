import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ticket, Calendar, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import TicketDialog from '@/components/TicketDialog'
import FraudReportDialog from '@/components/FraudReportDialog'
import { useCurrentUser } from '@/hooks/useAuth'

export const TICKET_STATUS = {
  en_attente: { label: 'En attente', className: 'bg-accent/15 text-accent border-accent/20' },
  confirme: { label: 'Confirmé', className: 'bg-primary/15 text-primary border-primary/20' },
  utilise: { label: 'Utilisé', className: 'bg-muted text-muted-foreground border-border' },
  annule: { label: 'Annulé', className: 'bg-destructive/15 text-destructive border-destructive/20' },
}

export default function Tickets() {
  const [selected, setSelected] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [fraudOpen, setFraudOpen] = useState(false)
  const { data: user, isLoading: loadingUser } = useCurrentUser()

  useEffect(() => {
    const h = (e) => { setSelected(e.detail.ticket); setSelectedEvent(e.detail.event); setFraudOpen(true) }
    window.addEventListener('openFraudReport', h)
    return () => window.removeEventListener('openFraudReport', h)
  }, [])

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['myTickets', user?.email],
    queryFn: () => api.entities.Ticket.filter({ buyer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  })
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 100) })
  const eventOf = (id) => events.find((e) => e.id === id)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-extrabold text-foreground">Mes Billets</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} billet{tickets.length > 1 ? 's' : ''}</p>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5">
        {(isLoading || loadingUser) && user !== null ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-card rounded-2xl h-32 border border-border/50" />)}</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-card border border-border/50 flex items-center justify-center mx-auto mb-4"><Ticket className="w-10 h-10 text-muted-foreground" /></div>
            <h3 className="text-lg font-bold text-foreground mb-2">Aucun billet</h3>
            <p className="text-sm text-muted-foreground">Tes billets apparaîtront ici après achat</p>
            {!user && <Link to="/connexion?from=/billets" className="inline-block mt-4 text-sm text-primary font-semibold hover:underline">Se connecter pour voir mes billets</Link>}
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => {
              const ev = eventOf(t.event_id)
              const st = TICKET_STATUS[t.status] || TICKET_STATUS.en_attente
              return (
                <button key={t.id} onClick={() => { setSelected(t); setSelectedEvent(ev) }} className="w-full text-left group">
                  <div className="bg-card border border-border/50 rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex">
                      {ev?.poster_url && <div className="w-24 h-28 flex-shrink-0"><img src={ev.poster_url} alt="" className="w-full h-full object-cover" /></div>}
                      <div className="flex-1 p-3.5 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm line-clamp-1">{ev?.title || 'Événement'}</h3>
                          {ev?.date && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(ev.date), 'd MMM yyyy à HH:mm', { locale: fr })}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2"><Badge variant="outline" className={`text-xs border ${st.className}`}>{st.label}</Badge><span className="text-xs text-muted-foreground">x{t.quantity}</span></div>
                          <span className="text-sm font-bold text-primary">{t.total_price?.toLocaleString('fr-FR')} F CFA</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-border/50 px-3.5 py-2.5 flex items-center justify-between bg-secondary/30">
                      <div className="flex items-center gap-2"><QrCode className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-mono text-muted-foreground">{t.ticket_code}</span></div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
      <TicketDialog open={!!selected && !fraudOpen} onOpenChange={(o) => !o && setSelected(null)} ticket={selected} event={selectedEvent} />
      <FraudReportDialog open={fraudOpen} onOpenChange={setFraudOpen} ticket={selected} event={selectedEvent} />
    </div>
  )
}
