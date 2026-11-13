import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Ticket, Heart, CalendarDays, Save, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import SubPageHeader from '@/components/SubPageHeader'
import { useRequireAuth } from '@/hooks/useAuth'

/** « Utilisateur — Ton profil social » : page absente de l'original. */
export default function Profil() {
  const qc = useQueryClient()
  const { user } = useRequireAuth()
  const [form, setForm] = useState({ full_name: '', bio: '' })
  const [avatar, setAvatar] = useState(null)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) { setForm({ full_name: user.full_name || '', bio: user.bio || '' }); setAvatar(user.avatar_url || null) } }, [user])

  const { data: tickets = [] } = useQuery({ queryKey: ['myTickets', user?.email], queryFn: () => api.entities.Ticket.filter({ buyer_email: user.email }), enabled: !!user?.email })
  const { data: favorites = [] } = useQuery({ queryKey: ['favorites', user?.email], queryFn: () => api.entities.Favorite.filter({ user_email: user.email }), enabled: !!user?.email })
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 100) })

  const attended = tickets.filter((t) => t.status === 'utilise').length
  const upcoming = tickets.filter((t) => { const e = events.find((x) => x.id === t.event_id); return e && new Date(e.date) >= new Date() && t.status !== 'annule' }).length

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      let avatar_url = user.avatar_url || ''
      if (file) avatar_url = (await api.integrations.Core.UploadFile({ file })).file_url
      await api.auth.updateMe({ ...form, avatar_url })
      qc.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success('Profil mis à jour')
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  if (!user) return null
  const initials = (user.full_name || user.email).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="min-h-screen">
      <SubPageHeader title="Ton profil social" subtitle={user.email} />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <div className="text-center">
          <label className="relative inline-block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setAvatar(URL.createObjectURL(f)) } }} />
            <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-2 border-primary/30 bg-secondary flex items-center justify-center">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-primary">{initials}</span>}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"><Camera className="w-4 h-4" /></div>
          </label>
          <h2 className="text-2xl font-bold text-foreground mt-3">{user.full_name}</h2>
          {user.city && <p className="text-sm text-muted-foreground">📍 {user.city}</p>}
          {user.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{user.bio}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[[Ticket, attended, 'Participés', 'text-primary'], [CalendarDays, upcoming, 'À venir', 'text-accent'], [Heart, favorites.length, 'Favoris', 'text-chart-4']].map(([Icon, n, l, c]) => (
            <div key={l} className="bg-card border border-border/50 rounded-xl p-3 text-center"><Icon className={`w-5 h-5 mx-auto mb-1 ${c}`} /><div className="text-xl font-bold text-foreground">{n}</div><p className="text-xs text-muted-foreground">{l}</p></div>
          ))}
        </div>
        <form onSubmit={save} className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
          <div><Label className="text-foreground text-sm">Nom affiché</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5 bg-secondary border-border text-foreground" /></div>
          <div><Label className="text-foreground text-sm">Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Parle un peu de toi : tes styles d'événements préférés..." maxLength={160} className="mt-1.5 bg-secondary border-border text-foreground h-20" /><p className="text-xs text-muted-foreground mt-1 text-right">{form.bio.length}/160</p></div>
          <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center gap-2">{saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer</Button>
        </form>
      </main>
    </div>
  )
}
