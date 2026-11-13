import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, ArrowDownToLine, Clock, CircleCheck, Smartphone, Info } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import SubPageHeader from '@/components/SubPageHeader'
import { useRequireAuth, useOrganizerProfile } from '@/hooks/useAuth'
import { PLATFORM_FEE_RATE, MIN_PAYOUT } from '@/lib/utils'
import { operatorsFor, dialCode } from '@/lib/geo'

export default function Versements() {
  const qc = useQueryClient()
  const { user } = useRequireAuth()
  const { data: organizer } = useOrganizerProfile(user)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', operator: '', phone: '' })

  const country = organizer?.country || user?.country || ''
  const operators = useMemo(() => operatorsFor(country), [country])

  const { data: events = [] } = useQuery({
    queryKey: ['organizerEvents', user?.email],
    queryFn: () => api.entities.Event.filter({ organizer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  })
  const { data: tickets = [] } = useQuery({
    queryKey: ['allTickets'], queryFn: () => api.entities.Ticket.list('-created_date', 5000), enabled: !!user?.email,
  })
  const { data: payouts = [] } = useQuery({
    queryKey: ['payouts', user?.email],
    queryFn: () => api.entities.Payout.filter({ organizer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  })

  // Le solde est calculé par la couche de données, seule source de vérité.
  const balance = useMemo(
    () => (user?.email ? api.ops.organizerBalance(user.email) : { gross: 0, fees: 0, withdrawn: 0, available: 0 }),
    [user?.email, tickets, payouts],
  )

  const eventIds = new Set(events.map((e) => e.id))
  const paid = tickets.filter((t) => eventIds.has(t.event_id) && (t.status === 'confirme' || t.status === 'utilise'))
  const perEvent = events.map((e) => {
    const list = paid.filter((t) => t.event_id === e.id)
    const gross = list.reduce((s, t) => s + (t.total_price || 0), 0)
    return { ...e, gross, net: Math.round(gross * (1 - PLATFORM_FEE_RATE)), count: list.reduce((s, t) => s + t.quantity, 0) }
  }).filter((e) => e.gross > 0)

  const request = useMutation({
    mutationFn: () => api.ops.requestPayout(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setOpen(false); setForm({ amount: '', operator: '', phone: '' })
      toast.success('Demande de versement envoyée')
    },
    onError: (e) => toast.error(e.message),
  })

  if (!user) return null

  return (
    <div className="min-h-screen">
      <SubPageHeader title="Versements" subtitle="Tes gains d'organisateur" />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {!organizer ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-muted-foreground">Les versements sont réservés aux organisateurs.</p>
            <Link to="/profil-organisateur" className="inline-block mt-4 text-sm text-primary font-semibold hover:underline">
              Créer mon profil organisateur
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 rounded-2xl p-5">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Wallet className="w-4 h-4" />Solde disponible</p>
              <p className="text-3xl font-extrabold text-primary mt-1">
                {balance.available.toLocaleString('fr-FR')} <span className="text-base font-semibold">F CFA</span>
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div><p className="text-xs text-muted-foreground">Brut</p><p className="text-sm font-bold text-foreground">{balance.gross.toLocaleString('fr-FR')} F</p></div>
                <div><p className="text-xs text-muted-foreground">Commission {PLATFORM_FEE_RATE * 100} %</p><p className="text-sm font-bold text-foreground">−{balance.fees.toLocaleString('fr-FR')} F</p></div>
                <div><p className="text-xs text-muted-foreground">Déjà versé</p><p className="text-sm font-bold text-foreground">{balance.withdrawn.toLocaleString('fr-FR')} F</p></div>
              </div>
              <Button
                onClick={() => { setForm((f) => ({ ...f, operator: operators[0]?.name || '', phone: organizer.phone || user.phone || '' })); setOpen(true) }}
                disabled={balance.available < MIN_PAYOUT}
                className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center gap-2"
              >
                <ArrowDownToLine className="w-4 h-4" />Demander un versement
              </Button>
              {balance.available < MIN_PAYOUT && (
                <p className="text-xs text-muted-foreground text-center mt-2">Minimum {MIN_PAYOUT.toLocaleString('fr-FR')} F CFA</p>
              )}
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-3 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Seuls les billets payés comptent. Les billets en attente de paiement et les billets annulés sont exclus du solde.
              </p>
            </div>

            <section>
              <h2 className="text-sm font-bold text-foreground mb-3">Par événement</h2>
              {perEvent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune vente pour l'instant.</p>
              ) : (
                <div className="space-y-2">
                  {perEvent.map((e) => (
                    <div key={e.id} className="bg-card border border-border/50 rounded-xl p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm line-clamp-1">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.count} billet(s) payé(s) · {e.date ? format(new Date(e.date), 'd MMM yyyy', { locale: fr }) : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">{e.net.toLocaleString('fr-FR')} F</p>
                        <p className="text-[10px] text-muted-foreground">brut {e.gross.toLocaleString('fr-FR')} F</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-bold text-foreground mb-3">Historique des versements</h2>
              {payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun versement demandé.</p>
              ) : (
                <div className="space-y-2">
                  {payouts.map((p) => (
                    <div key={p.id} className="bg-card border border-border/50 rounded-xl p-3.5 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${p.status === 'verse' ? 'bg-primary/15' : 'bg-accent/15'}`}>
                        {p.status === 'verse' ? <CircleCheck className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{p.amount.toLocaleString('fr-FR')} F CFA</p>
                        <p className="text-xs text-muted-foreground truncate">{p.operator} · {p.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-semibold ${p.status === 'verse' ? 'text-primary' : 'text-accent'}`}>
                          {p.status === 'verse' ? 'Versé' : 'En attente'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(p.created_date), 'd MMM', { locale: fr })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Demander un versement</DialogTitle>
            <DialogDescription className="text-muted-foreground">Envoyé par Mobile Money sous 48 h ouvrées</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-foreground text-sm">Montant (F CFA)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={String(balance.available)} className="mt-1.5 bg-secondary border-border text-foreground" />
              <button onClick={() => setForm({ ...form, amount: String(balance.available) })} className="text-xs text-primary mt-1 hover:underline">
                Tout retirer ({balance.available.toLocaleString('fr-FR')} F)
              </button>
            </div>
            <div>
              <Label className="text-foreground text-sm">Opérateur</Label>
              <Select value={form.operator} onValueChange={(v) => setForm({ ...form, operator: v })}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border text-foreground"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{operators.map((o) => <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground text-sm">Numéro Mobile Money</Label>
              <div className="relative mt-1.5">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={`${dialCode(country)} 90 00 00 00`} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary h-11 rounded-xl" onClick={() => setOpen(false)}>Annuler</Button>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold" onClick={() => request.mutate()} disabled={request.isPending}>
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
