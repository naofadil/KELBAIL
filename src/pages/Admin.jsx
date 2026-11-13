import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Shield, CircleCheck, CircleX, Zap, CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRequireAuth } from '@/hooks/useAuth'

export const ORGANIZER_STATUS = {
  en_attente: { label: '⏳ En attente', color: 'bg-accent/15 text-accent', border: 'border-accent/20' },
  approuve: { label: '✅ Approuvé', color: 'bg-primary/15 text-primary', border: 'border-primary/20' },
  rejete: { label: '❌ Rejeté', color: 'bg-destructive/15 text-destructive', border: 'border-destructive/20' },
  suspendu: { label: '⚠️ Suspendu', color: 'bg-yellow-500/15 text-yellow-600', border: 'border-yellow-500/20' },
}

export default function Admin() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('en_attente')
  const { user, isLoading } = useRequireAuth()

  useEffect(() => { if (!isLoading && user && user.role !== 'admin') navigate('/') }, [user, isLoading, navigate])

  const { data: organizers = [], isLoading: loading } = useQuery({
    queryKey: ['allOrganizers'],
    queryFn: () => api.entities.Organizer.list('-created_date', 100),
    enabled: user?.role === 'admin',
  })

  /**
   * Une seule mutation paramétrée. La version précédente appelait `useMutation`
   * depuis une fonction auxiliaire, ce qui viole les règles des hooks : l'ordre
   * des appels n'aurait plus été stable dès qu'un retour anticipé aurait été
   * ajouté au-dessus.
   */
  const act = useMutation({
    mutationFn: ({ organizer, patch, message }) => api.ops.setOrganizerStatus(organizer.id, patch, message),
    onSuccess: (_, { toastText }) => {
      qc.invalidateQueries({ queryKey: ['allOrganizers'] })
      toast.success(toastText)
    },
    onError: (e) => toast.error(e.message),
  })

  const approve = (organizer) => act.mutate({
    organizer, patch: { status: 'approuve' }, toastText: 'Organisateur approuvé',
    message: { title: 'Profil approuvé 🎉', body: 'Tu peux maintenant publier des événements.' },
  })
  const reject = (organizer) => act.mutate({
    organizer, patch: { status: 'rejete' }, toastText: 'Organisateur rejeté',
    message: { title: 'Profil rejeté', body: "Contacte le support pour plus d'informations." },
  })
  const suspend = (organizer) => act.mutate({
    organizer, patch: { status: 'suspendu' }, toastText: 'Organisateur suspendu',
    message: { title: 'Compte suspendu', body: 'Ton compte organisateur a été suspendu.' },
  })
  const verify = (organizer) => act.mutate({
    organizer, patch: { is_verified: true }, toastText: 'Organisateur vérifié',
    message: { title: 'Badge vérifié ✓', body: 'Ton organisation est désormais certifiée Kel Bail.' },
  })

  if (!user || user.role !== 'admin') return null
  const visible = organizers.filter((o) => o.status === tab)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="text-lg font-bold text-foreground">Tableau de Bord Admin</h1><p className="text-xs text-muted-foreground">Gestion des organisateurs</p></div>
          </div>
          <Link to="/admin/fraudes" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-semibold"><Shield className="w-4 h-4" />Fraudes</Link>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-3.5 text-center"><div className="text-xl font-bold text-accent">{organizers.filter((o) => o.status === 'en_attente').length}</div><p className="text-xs text-muted-foreground mt-1">En attente</p></div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 text-center"><div className="text-xl font-bold text-primary">{organizers.filter((o) => o.status === 'approuve').length}</div><p className="text-xs text-muted-foreground mt-1">Approuvés</p></div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border/50">
            <TabsTrigger value="en_attente" className="data-[state=active]:bg-secondary text-xs">En attente</TabsTrigger>
            <TabsTrigger value="approuve" className="data-[state=active]:bg-secondary text-xs">Approuvés</TabsTrigger>
            <TabsTrigger value="rejete" className="data-[state=active]:bg-secondary text-xs">Rejetés</TabsTrigger>
            <TabsTrigger value="suspendu" className="data-[state=active]:bg-secondary text-xs">Suspendus</TabsTrigger>
          </TabsList>
          {Object.keys(ORGANIZER_STATUS).map((s) => (
            <TabsContent key={s} value={s} className="space-y-3 mt-4">
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-card rounded-xl h-24 border border-border/50" />)}</div>
              ) : visible.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Aucun organisateur {ORGANIZER_STATUS[s].label.toLowerCase()}</div>
              ) : (
                <div className="space-y-3">
                  {visible.map((o) => (
                    <div key={o.id} className={`border rounded-xl p-4 ${ORGANIZER_STATUS[o.status].border}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-foreground">{o.company_name}</h3>{o.is_verified && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">✓ Vérifié</span>}</div>
                          <p className="text-sm text-muted-foreground">{o.user_email}</p>
                          {o.city && <p className="text-xs text-muted-foreground mt-1">📍 {o.city}</p>}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${ORGANIZER_STATUS[o.status].color}`}>{ORGANIZER_STATUS[o.status].label}</span>
                      </div>
                      {o.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{o.description}</p>}
                      <div className="flex gap-2 mb-3 text-xs text-muted-foreground"><span>📊 {o.total_events || 0} événements</span><span>⭐ {o.rating?.toFixed(1) || 0}/5</span></div>
                      <div className="flex gap-2 flex-wrap">
                        {s === 'en_attente' && <>
                          <Button size="sm" className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 text-xs h-8" onClick={() => approve(o)} disabled={act.isPending}><CircleCheck className="w-3 h-3 mr-1" />Approuver</Button>
                          <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5 text-xs h-8" onClick={() => reject(o)} disabled={act.isPending}><CircleX className="w-3 h-3 mr-1" />Rejeter</Button>
                        </>}
                        {s === 'approuve' && <>
                          {!o.is_verified && <Button size="sm" className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 text-xs h-8" onClick={() => verify(o)} disabled={act.isPending}><Zap className="w-3 h-3 mr-1" />Vérifier</Button>}
                          <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/5 text-xs h-8" onClick={() => suspend(o)} disabled={act.isPending}><CircleAlert className="w-3 h-3 mr-1" />Suspendre</Button>
                        </>}
                        {s === 'rejete' && <Button size="sm" className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 text-xs h-8" onClick={() => approve(o)} disabled={act.isPending}><CircleCheck className="w-3 h-3 mr-1" />Approuver</Button>}
                        {s === 'suspendu' && <Button size="sm" className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 text-xs h-8" onClick={() => approve(o)} disabled={act.isPending}><CircleCheck className="w-3 h-3 mr-1" />Réactiver</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  )
}
