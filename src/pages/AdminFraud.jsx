import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, TriangleAlert, Clock, CircleCheck, CircleX } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useRequireAuth } from '@/hooks/useAuth'

const FRAUD_STATUS = {
  reported: { label: 'Signalé', color: 'text-accent', bg: 'bg-accent/10', icon: TriangleAlert },
  under_review: { label: 'En examen', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock },
  confirmed: { label: 'Confirmé', color: 'text-destructive', bg: 'bg-destructive/10', icon: TriangleAlert },
  resolved: { label: 'Résolu', color: 'text-green-500', bg: 'bg-green-500/10', icon: CircleCheck },
  dismissed: { label: 'Rejeté', color: 'text-muted-foreground', bg: 'bg-muted/10', icon: CircleX },
}
const TYPE_LABEL = { duplicate_use: '🔄 Double utilisation de billet', fake_organizer: '🎭 Organisateur frauduleux', suspicious_activity: '⚠️ Activité suspecte', other: '❓ Autre fraude' }

export default function AdminFraud() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [notes, setNotes] = useState('')
  const { user, isLoading } = useRequireAuth()
  useEffect(() => { if (!isLoading && user && user.role !== 'admin') navigate('/') }, [user, isLoading, navigate])

  const { data: reports = [], isLoading: loading } = useQuery({ queryKey: ['fraudReports'], queryFn: () => api.entities.FraudReport.list('-created_date', 100), enabled: user?.role === 'admin' })
  const { data: tickets = [] } = useQuery({ queryKey: ['allTickets'], queryFn: () => api.entities.Ticket.list('-created_date', 1000), enabled: user?.role === 'admin' })
  const { data: organizers = [] } = useQuery({ queryKey: ['organizers'], queryFn: () => api.entities.Organizer.list('-created_date', 100), enabled: user?.role === 'admin' })
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 100) })

  const update = useMutation({
    mutationFn: ({ status, adminNotes }) => api.ops.reviewFraudReport(selected.id, { status, adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fraudReports'] })
      qc.invalidateQueries({ queryKey: ['organizers'] })
      toast.success('Signalement mis à jour')
      setSelected(null); setNotes('')
    },
    onError: (e) => toast.error(e.message),
  })

  if (!user || user.role !== 'admin') return null
  const visible = reports.filter((r) => filter === 'all' || r.status === filter)
  const ticketOf = (id) => tickets.find((t) => t.id === id)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-xl font-bold text-foreground">Gestion des Fraudes</h1><p className="text-xs text-muted-foreground">Signalements et investigations</p></div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[['Total', reports.length, 'text-foreground'], ['Nouveaux', reports.filter((r) => r.status === 'reported').length, 'text-accent'], ['Confirmés', reports.filter((r) => r.status === 'confirmed').length, 'text-destructive'], ['Résolus', reports.filter((r) => r.status === 'resolved').length, 'text-green-500']].map(([l, n, c]) => (
            <div key={l} className="bg-card border border-border/50 rounded-xl p-3 text-center"><div className={`text-2xl font-bold ${c}`}>{n}</div><p className="text-xs text-muted-foreground">{l}</p></div>
          ))}
        </div>
        <div className="mb-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-card border-border text-foreground w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="reported">Signalés</SelectItem>
              <SelectItem value="under_review">En examen</SelectItem>
              <SelectItem value="confirmed">Confirmés</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
              <SelectItem value="dismissed">Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-card rounded-xl h-20 border border-border/50" />)}</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Aucun signalement</p></div>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => {
              const s = FRAUD_STATUS[r.status] || FRAUD_STATUS.reported
              const Icon = s.icon
              const t = ticketOf(r.ticket_id)
              return (
                <button key={r.id} onClick={() => { setSelected(r); setNotes(r.admin_notes || '') }} className="w-full text-left bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 ${s.color}`} /><span className={`text-xs font-semibold ${s.color}`}>{s.label}</span></div>
                  <p className="font-medium text-foreground text-sm">{TYPE_LABEL[r.type] || r.type}</p>
                  {t && <p className="text-xs text-muted-foreground mt-1">Billet: {t.ticket_code} • Acheteur: {t.buyer_email}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{r.description}</p>
                </button>
              )
            })}
          </div>
        )}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4">
              <div><h3 className="font-bold text-foreground text-lg mb-2">Examiner le signalement</h3><p className="text-sm text-muted-foreground">{selected.description}</p></div>
              <div>
                <label className="text-sm text-foreground font-medium mb-1.5 block">Statut</label>
                <Select defaultValue={selected.status} onValueChange={(v) => setSelected({ ...selected, status: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Signalé</SelectItem>
                    <SelectItem value="under_review">En examen</SelectItem>
                    <SelectItem value="confirmed">Confirmé</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="dismissed">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm text-foreground font-medium mb-1.5 block">Notes d'admin</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ajoute tes notes..." className="bg-secondary border-border text-foreground h-20" /></div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary" onClick={() => { setSelected(null); setNotes('') }}>Fermer</Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => update.mutate({ status: selected.status, adminNotes: notes })} disabled={update.isPending}>Sauvegarder</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
