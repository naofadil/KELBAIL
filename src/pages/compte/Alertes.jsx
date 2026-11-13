import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import SubPageHeader from '@/components/SubPageHeader'
import { NOTIFICATION_TYPES, useNotifications } from '@/components/NotificationsBell'
import { useRequireAuth } from '@/hooks/useAuth'
import { SEARCH_CATEGORIES } from '@/lib/utils'

const DEFAULTS = { new_event_city: true, reminder_24h: true, reminder_2h: true, price_drop: false, organizer_news: true, categories: [], max_price: '' }

/** Alertes billets : préférences de notification + historique. */
export default function Alertes() {
  const qc = useQueryClient()
  const { user } = useRequireAuth()
  const [prefs, setPrefs] = useState(DEFAULTS)
  const { data: saved } = useQuery({ queryKey: ['alertPrefs', user?.email], queryFn: async () => (await api.entities.AlertPreference.filter({ user_email: user.email }))[0] || null, enabled: !!user?.email })
  const { data: notifications = [] } = useNotifications()
  useEffect(() => { if (saved) setPrefs({ ...DEFAULTS, ...saved }) }, [saved])

  const save = useMutation({
    mutationFn: async (p) => (saved ? api.entities.AlertPreference.update(saved.id, p) : api.entities.AlertPreference.create({ user_email: user.email, ...p })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alertPrefs'] }); toast.success('Préférences enregistrées') },
  })
  const markAll = useMutation({
    mutationFn: async () => { for (const n of notifications.filter((x) => x.status === 'unread')) await api.entities.Notification.update(n.id, { status: 'read' }) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }))
  const toggleCat = (c) => setPrefs((p) => ({ ...p, categories: p.categories.includes(c) ? p.categories.filter((x) => x !== c) : [...p.categories, c] }))

  if (!user) return null
  const Row = ({ k, label, desc }) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border/30 last:border-0">
      <div><p className="text-sm font-medium text-foreground">{label}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>
      <Switch checked={!!prefs[k]} onCheckedChange={() => toggle(k)} />
    </div>
  )
  return (
    <div className="min-h-screen">
      <SubPageHeader title="Alertes billets" subtitle="Configure tes notifications" />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <section className="bg-card border border-border/50 rounded-2xl px-4 py-1">
          <Row k="new_event_city" label="Nouveaux événements près de chez toi" desc={user.city ? `À ${user.city}` : 'Renseigne ta ville dans les paramètres'} />
          <Row k="reminder_24h" label="Rappel 24 h avant" desc="Pour les événements où tu as un billet" />
          <Row k="reminder_2h" label="Rappel 2 h avant" />
          <Row k="price_drop" label="Baisse de prix / dernières places" desc="Sur tes événements favoris" />
          <Row k="organizer_news" label="Actualités des organisateurs" desc="Organisateurs dont tu as déjà acheté un billet" />
        </section>
        <section className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Catégories qui t'intéressent</p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
              <button key={c.value} onClick={() => toggleCat(c.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${prefs.categories.includes(c.value) ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border/50 text-muted-foreground'}`}>{c.label}</button>
            ))}
          </div>
          <div><p className="text-sm font-medium text-foreground mb-1.5">Budget max par billet (F CFA)</p><Input type="number" value={prefs.max_price} onChange={(e) => setPrefs({ ...prefs, max_price: e.target.value })} placeholder="Ex: 10000" className="bg-secondary border-border text-foreground" /></div>
          <Button onClick={() => save.mutate(prefs)} disabled={save.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold">Enregistrer mes préférences</Button>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Bell className="w-4 h-4" />Historique</h2>
            {notifications.some((n) => n.status === 'unread') && <button onClick={() => markAll.mutate()} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"><CheckCheck className="w-3.5 h-3.5" />Tout marquer lu</button>}
          </div>
          {notifications.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aucune notification pour l'instant</p> : (
            <div className="space-y-2">
              {notifications.map((n) => { const t = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.new_event; return (
                <div key={n.id} className={`p-3 rounded-xl border ${n.status === 'unread' ? 'bg-secondary/50 border-border/50' : 'bg-card border-border/30 opacity-75'}`}>
                  <p className={`text-xs font-semibold ${t.color}`}>{t.label}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">{format(new Date(n.created_date), 'd MMM à HH:mm', { locale: fr })}</p>
                </div>) })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
