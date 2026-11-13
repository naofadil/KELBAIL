import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Zap, Ban, Wallet, BellRing, Plus, LoaderCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import ManualCodeInput from '@/components/ManualCodeInput'
import QrScanner from '@/components/QrScanner'
import TicketListItem from '@/components/TicketListItem'
import { useCurrentUser } from '@/hooks/useAuth'
import { PLATFORM_FEE_RATE, eventStatus } from '@/lib/utils'

export default function Management() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [recent, setRecent] = useState([])
  const [capacityOpen, setCapacityOpen] = useState(false)
  const [capacity, setCapacity] = useState('')
  const { data: user, isLoading: loadingUser } = useCurrentUser()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['organizerEvents', user?.email],
    queryFn: () => api.entities.Event.filter({ organizer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  })
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['eventTickets', selectedId],
    queryFn: () => api.entities.Ticket.filter({ event_id: selectedId }, '-created_date'),
    enabled: !!selectedId,
  })
  const { data: waitlist = [] } = useQuery({
    queryKey: ['eventWaitlist', selectedId],
    queryFn: () => api.entities.Waitlist.filter({ event_id: selectedId }),
    enabled: !!selectedId,
  })

  const refreshEvent = () => {
    qc.invalidateQueries({ queryKey: ['organizerEvents'] })
    qc.invalidateQueries({ queryKey: ['events'] })
    qc.invalidateQueries({ queryKey: ['eventTickets', selectedId] })
    qc.invalidateQueries({ queryKey: ['eventWaitlist', selectedId] })
  }

  const validate = useMutation({
    mutationFn: (code) => api.ops.validateTicket({ code, eventId: selectedId }),
    onSuccess: (res) => {
      refreshEvent()
      if (res.status === 'valid') {
        setRecent((r) => [{ ...res.ticket, status: 'utilise', updated_date: new Date().toISOString() }, ...r.slice(0, 4)])
        toast.success(res.message)
      } else if (res.status === 'used') toast.error(res.message)
      else toast.warning(res.message)
    },
    onError: (e) => toast.error(e.message),
  })

  const cancelEvent = useMutation({
    mutationFn: () => api.ops.cancelEvent(selectedId),
    onSuccess: (n) => { refreshEvent(); toast.success(`Événement annulé. ${n} acheteur(s) prévenu(s).`) },
    onError: (e) => toast.error(e.message),
  })

  const changeCapacity = useMutation({
    mutationFn: () => api.ops.setCapacity(selectedId, Number(capacity)),
    onSuccess: (notified) => {
      refreshEvent(); setCapacityOpen(false)
      toast.success(notified > 0 ? `Jauge mise à jour. ${notified} personne(s) en attente prévenue(s).` : 'Jauge mise à jour.')
    },
    onError: (e) => toast.error(e.message),
  })

  const selected = events.find((e) => e.id === selectedId)
  const validated = tickets.filter((t) => t.status === 'utilise').length
  const expected = tickets.filter((t) => t.status === 'confirme' || t.status === 'utilise').length
  const waiting = waitlist.length
  // Les personnes déjà prévenues n'ont plus besoin qu'on leur ouvre des places.
  const pending = waitlist.filter((w) => !w.notified).length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors flex-shrink-0" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Gestion Organisateur</h1>
              <p className="text-xs text-muted-foreground">Valide les billets d'entrée</p>
            </div>
          </div>
          {events.length > 0 && (
            <Link to="/compte/versements" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex-shrink-0">
              <Wallet className="w-4 h-4" />Gains
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {isLoading || loadingUser ? (
          <div className="animate-pulse bg-card rounded-2xl h-16 border border-border/50" />
        ) : !user ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Connecte-toi pour gérer tes événements</p>
            <Link to="/connexion?from=/gestion" className="text-primary font-semibold hover:underline">Se connecter</Link>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🎪</p>
            <p className="text-muted-foreground mb-4">Tu n'as pas d'événement créé</p>
            <Link to="/vendre" className="text-primary font-semibold hover:underline">Créer un événement</Link>
          </div>
        ) : (
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">Sélectionne un événement</label>
            <div className="grid gap-2">
              {events.map((ev) => {
                const st = eventStatus(ev)
                return (
                  <button
                    key={ev.id} onClick={() => { setSelectedId(ev.id); setRecent([]); setCapacity(String(ev.tickets_available)) }}
                    className={`p-3 rounded-xl border transition-all text-left ${selectedId === ev.id ? 'bg-primary/10 border-primary/40' : 'bg-card border-border/50 hover:border-primary/20'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{ev.title}</p>
                      {st.label && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          st.tone === 'destructive' ? 'bg-destructive/15 text-destructive' : st.tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
                        }`}>{st.label.toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ev.date ? format(new Date(ev.date), 'd MMM yyyy', { locale: fr }) : ''} · {ev.tickets_sold || 0}/{ev.tickets_available} vendus
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {selectedId && selected && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{validated}</div>
                <p className="text-xs text-muted-foreground mt-1">Validés</p>
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-accent">{expected}</div>
                <p className="text-xs text-muted-foreground mt-1">Attendus</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{waiting}</div>
                <p className="text-xs text-muted-foreground mt-1">En attente</p>
              </div>
            </div>

            {pending > 0 && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
                <BellRing className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-accent font-medium">
                    {pending} personne{pending > 1 ? 's attendent' : ' attend'} une place
                  </p>
                  <p className="text-xs text-accent/80 mt-0.5 mb-2">
                    Augmente la jauge pour les prévenir automatiquement avant la remise en vente.
                  </p>
                  <Button size="sm" onClick={() => setCapacityOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8 rounded-lg font-semibold">
                    <Plus className="w-3.5 h-3.5 mr-1" />Ouvrir des places
                  </Button>
                </div>
              </div>
            )}

            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-card border border-border/50">
                <TabsTrigger value="scan" className="data-[state=active]:bg-secondary">Scanner</TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-secondary">Billets ({tickets.length})</TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-secondary">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-5 mt-4">
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-accent">Scanne le QR code ou saisis le code du billet pour valider l'entrée.</p>
                </div>
                <QrScanner onDetected={(code) => validate.mutate(code)} disabled={validate.isPending} />
                <ManualCodeInput onSubmit={(code) => validate.mutate(code)} isLoading={validate.isPending} />
                {recent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Dernièrement validés</h3>
                    <div className="space-y-2">{recent.map((t, i) => <TicketListItem key={`${t.id}-${i}`} ticket={t} event={selected} />)}</div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="list" className="space-y-3 mt-4">
                {loadingTickets ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-card rounded-xl h-20 border border-border/50" />)}</div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8"><p className="text-muted-foreground">Aucun billet pour cet événement</p></div>
                ) : (
                  <div className="space-y-2">{tickets.map((t) => <TicketListItem key={t.id} ticket={t} event={selected} />)}</div>
                )}
              </TabsContent>

              <TabsContent value="stats" className="space-y-4 mt-4">
                {(() => {
                  const sold = selected.tickets_sold || 0
                  const gross = sold * (selected.ticket_price || 0)
                  const net = Math.round(gross * (1 - PLATFORM_FEE_RATE))
                  const fill = selected.tickets_available ? Math.round((sold / selected.tickets_available) * 100) : 0
                  const attendance = expected ? Math.round((validated / expected) * 100) : 0
                  return (
                    <>
                      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Taux de remplissage</span>
                          <span className="font-bold text-foreground">{fill}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, fill)}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{sold} billets vendus sur {selected.tickets_available}</p>
                      </div>

                      {expected > 0 && (
                        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Présence à l'entrée</span>
                            <span className="font-bold text-foreground">{attendance}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${attendance}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">{validated} entrées validées sur {expected} billets payés</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card border border-border/50 rounded-xl p-4">
                          <p className="text-xs text-muted-foreground">Recettes brutes</p>
                          <p className="text-lg font-bold text-foreground">{gross.toLocaleString('fr-FR')} F</p>
                        </div>
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                          <p className="text-xs text-muted-foreground">Net (−{PLATFORM_FEE_RATE * 100} %)</p>
                          <p className="text-lg font-bold text-primary">{net.toLocaleString('fr-FR')} F</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button variant="outline" onClick={() => setCapacityOpen(true)} className="w-full border-border text-foreground hover:bg-secondary h-11 rounded-xl flex items-center gap-2">
                          <Plus className="w-4 h-4" />Modifier la jauge
                        </Button>
                        {selected.status !== 'annule' && (
                          <Button
                            variant="outline"
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 h-11 rounded-xl flex items-center gap-2"
                            onClick={() => {
                              if (confirm(`Annuler « ${selected.title} » ? Tous les billets seront annulés et les acheteurs prévenus.`)) cancelEvent.mutate()
                            }}
                            disabled={cancelEvent.isPending}
                          >
                            {cancelEvent.isPending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                            Annuler l'événement
                          </Button>
                        )}
                      </div>
                    </>
                  )
                })()}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <Dialog open={capacityOpen} onOpenChange={setCapacityOpen}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier la jauge</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {waiting > 0
                ? `${waiting} personne(s) sur liste d'attente seront prévenues si tu ouvres des places.`
                : 'Nombre total de billets mis en vente.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              type="number" min={selected?.tickets_sold || 0} value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="bg-secondary border-border text-foreground text-lg text-center font-bold"
            />
            <p className="text-xs text-muted-foreground text-center">
              Minimum {selected?.tickets_sold || 0} (billets déjà vendus)
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary h-11 rounded-xl" onClick={() => setCapacityOpen(false)}>Annuler</Button>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold" onClick={() => changeCapacity.mutate()} disabled={changeCapacity.isPending}>
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
