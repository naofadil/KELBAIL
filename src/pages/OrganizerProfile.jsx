import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, Users, Zap, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRequireAuth, useOrganizerProfile } from '@/hooks/useAuth'

const EMPTY = { company_name: '', description: '', phone: '', website: '', city: '', social_media: { instagram: '', facebook: '', twitter: '' } }

export default function OrganizerProfile() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useRequireAuth()
  const { data: organizer, isLoading } = useOrganizerProfile(user)
  const [editing, setEditing] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (organizer) {
      setForm({ company_name: organizer.company_name || '', description: organizer.description || '', phone: organizer.phone || '', website: organizer.website || '', city: organizer.city || '', social_media: organizer.social_media || EMPTY.social_media })
      if (organizer.logo_url) setPreview(organizer.logo_url)
    } else if (user) {
      setForm((f) => ({ ...f, phone: user.phone || '', city: user.city || '' }))
    }
  }, [organizer, user])

  const save = useMutation({
    mutationFn: async () => {
      let logo_url = organizer?.logo_url || ''
      if (file) logo_url = (await api.integrations.Core.UploadFile({ file })).file_url
      if (organizer) await api.entities.Organizer.update(organizer.id, { ...form, logo_url })
      else {
        await api.entities.Organizer.create({ user_email: user.email, ...form, logo_url, status: 'en_attente', is_verified: false, total_events: 0, rating: 0 })
        const admins = await api.entities.User.filter({ role: 'admin' })
        for (const a of admins) await api.entities.Notification.create({ user_email: a.email, type: 'organizer', status: 'unread', title: 'Nouvelle demande organisateur', message: `${form.company_name} attend ton approbation`, action_url: '/admin' })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizerProfile', user?.email] }); setEditing(false); setFile(null); toast.success(`Profil organisateur ${organizer ? 'mis à jour' : 'créé'} avec succès`) },
  })

  const set = (k, v) => {
    if (k.includes('.')) { const [a, b] = k.split('.'); setForm((f) => ({ ...f, [a]: { ...f[a], [b]: v } })) } else setForm((f) => ({ ...f, [k]: v }))
  }
  const onFile = (e) => { const f = e.target.files[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)) } }

  if (!user || isLoading) return null
  const showForm = editing || !organizer

  const statusBadge = organizer && (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${organizer.status === 'approuve' ? 'bg-primary/15 text-primary' : organizer.status === 'rejete' ? 'bg-destructive/15 text-destructive' : organizer.status === 'suspendu' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-accent/15 text-accent'}`}>
      {organizer.status === 'approuve' ? '✅ Approuvé' : organizer.status === 'rejete' ? '❌ Rejeté' : organizer.status === 'suspendu' ? '⚠️ Suspendu' : '⏳ En attente'}
    </span>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/compte')} className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="text-lg font-bold text-foreground">Profil Organisateur</h1><p className="text-xs text-muted-foreground">{user.full_name}</p></div>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5">
        {!showForm ? (
          <div className="space-y-5">
            <div className="text-center">
              {preview ? <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-2 border-primary/30 mb-4"><img src={preview} alt="Logo" className="w-full h-full object-cover" /></div> : <div className="w-24 h-24 rounded-full mx-auto bg-secondary border-2 border-border flex items-center justify-center mb-4"><span className="text-4xl">🏢</span></div>}
              <h2 className="text-2xl font-bold text-foreground">{organizer.company_name}</h2>
              <div className="flex items-center justify-center gap-2 mt-2">{statusBadge}{organizer.is_verified && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary">✓ Vérifié</span>}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-foreground">{organizer.total_events || 0}</div><p className="text-xs text-muted-foreground mt-1">Événements</p></div>
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-primary">{organizer.rating?.toFixed(1) || 0}/5</div><p className="text-xs text-muted-foreground mt-1">Évaluation</p></div>
            </div>
            <div className="space-y-3">
              <div className="bg-card border border-border/50 rounded-xl p-4"><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{organizer.description || 'Pas de description'}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">📍 Ville</p><p className="text-sm font-medium text-foreground">{organizer.city || '-'}</p></div>
                <div className="bg-card border border-border/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">📞 Téléphone</p><p className="text-sm font-medium text-foreground">{organizer.phone || '-'}</p></div>
              </div>
              {organizer.website && <div className="bg-card border border-border/50 rounded-xl p-4"><p className="text-xs text-muted-foreground mb-1">🌐 Site web</p><a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{organizer.website}</a></div>}
            </div>
            <div className="space-y-3 mt-6">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl text-base font-bold" onClick={() => setEditing(true)}>Modifier le profil</Button>
              {organizer.status === 'approuve' && (
                <Link to="/staff-management" className="block"><Button className="w-full bg-primary/15 text-primary hover:bg-primary/25 h-12 rounded-xl text-base font-bold flex items-center justify-center gap-2"><Users className="w-5 h-5" />Gérer le staff</Button></Link>
              )}
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Logo/Image de profil</label>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                {preview ? (
                  <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-primary/30 mx-auto"><img src={preview} alt="Logo" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Upload className="w-5 h-5 text-white" /></div></div>
                ) : (
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-border bg-card flex items-center justify-center mx-auto hover:border-primary/40 transition-colors"><Upload className="w-8 h-8 text-muted-foreground" /></div>
                )}
              </label>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm text-foreground">Nom de l'organisation *</label><Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="Ex: EventPro Mali" className="mt-1.5 bg-secondary border-border text-foreground" required /></div>
              <div><label className="text-sm text-foreground">Description</label><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Décris ton organisation..." className="mt-1.5 bg-secondary border-border text-foreground h-20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-foreground">📍 Ville</label><Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ex: Bamako" className="mt-1.5 bg-secondary border-border text-foreground" /></div>
                <div><label className="text-sm text-foreground">📞 Téléphone</label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Ex: +223..." className="mt-1.5 bg-secondary border-border text-foreground" /></div>
              </div>
              <div><label className="text-sm text-foreground">🌐 Site web (optionnel)</label><Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." className="mt-1.5 bg-secondary border-border text-foreground" /></div>
              <div>
                <label className="text-sm text-foreground mb-2 block">Réseaux sociaux</label>
                <div className="space-y-2">
                  <Input value={form.social_media.instagram} onChange={(e) => set('social_media.instagram', e.target.value)} placeholder="Instagram (@username)" className="bg-secondary border-border text-foreground" />
                  <Input value={form.social_media.facebook} onChange={(e) => set('social_media.facebook', e.target.value)} placeholder="Facebook (URL)" className="bg-secondary border-border text-foreground" />
                  <Input value={form.social_media.twitter} onChange={(e) => set('social_media.twitter', e.target.value)} placeholder="Twitter/X (@username)" className="bg-secondary border-border text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              {organizer && <Button type="button" variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary h-11 rounded-xl" onClick={() => { setEditing(false); setFile(null) }}>Annuler</Button>}
              <Button type="submit" disabled={save.isPending || !form.company_name} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center justify-center gap-2">
                {save.isPending ? <><LoaderCircle className="w-4 h-4 animate-spin" />Sauvegarde...</> : <><Zap className="w-4 h-4" />{organizer ? 'Enregistrer' : 'Envoyer ma demande'}</>}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
