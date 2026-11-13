import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2, LoaderCircle, Save, KeyRound, DatabaseZap } from 'lucide-react'
import { toast } from 'sonner'
import { api, resetDatabase } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import SubPageHeader from '@/components/SubPageHeader'
import { useRequireAuth } from '@/hooks/useAuth'

export default function Parametres() {
  const qc = useQueryClient()
  const { user } = useRequireAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', city: '' })
  const [pwd, setPwd] = useState({ current: '', next: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) setForm({ full_name: user.full_name || '', phone: user.phone || '', city: user.city || '' }) }, [user])

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.auth.updateMe(form); qc.invalidateQueries({ queryKey: ['currentUser'] }); toast.success('Informations mises à jour') }
    catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }
  const changePassword = async (e) => {
    e.preventDefault()
    try { await api.auth.changePassword(pwd); setPwd({ current: '', next: '' }); toast.success('Mot de passe modifié') }
    catch (err) { toast.error(err.message) }
  }
  const deleteAccount = async () => {
    try { await api.auth.updateMe({ deleted: true }); toast.success('Compte supprimé'); api.auth.logout('/') }
    catch { toast.error('Erreur lors de la suppression') }
  }

  if (!user) return null
  return (
    <div className="min-h-screen">
      <SubPageHeader title="Paramètres du compte" subtitle="Gère tes informations" />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <form onSubmit={save} className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Informations personnelles</h2>
          <div><Label className="text-foreground text-sm">Email</Label><Input value={user.email} disabled className="mt-1.5 bg-secondary/50 border-border text-muted-foreground" /></div>
          <div><Label className="text-foreground text-sm">Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5 bg-secondary border-border text-foreground" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-foreground text-sm">Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+228..." className="mt-1.5 bg-secondary border-border text-foreground" /></div>
            <div><Label className="text-foreground text-sm">Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lomé" className="mt-1.5 bg-secondary border-border text-foreground" /></div>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center gap-2">{saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer</Button>
        </form>

        <form onSubmit={changePassword} className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><KeyRound className="w-4 h-4 text-muted-foreground" />Mot de passe</h2>
          <div><Label className="text-foreground text-sm">Mot de passe actuel</Label><Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} autoComplete="current-password" className="mt-1.5 bg-secondary border-border text-foreground" /></div>
          <div><Label className="text-foreground text-sm">Nouveau mot de passe</Label><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} autoComplete="new-password" minLength={8} className="mt-1.5 bg-secondary border-border text-foreground" /></div>
          <Button type="submit" variant="outline" disabled={!pwd.current || !pwd.next} className="w-full border-border text-foreground hover:bg-secondary h-11 rounded-xl font-semibold">Modifier le mot de passe</Button>
        </form>

        <div className="pt-4">
          <h2 className="text-sm font-bold text-foreground mb-4">Danger Zone</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 h-11 flex items-center justify-center gap-2" onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4" />Supprimer mon compte</Button>
            <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-secondary h-11 flex items-center justify-center gap-2" onClick={async () => { if (confirm('Réinitialiser toutes les données locales de démonstration ?')) { await resetDatabase(); window.location.href = '/' } }}><DatabaseZap className="w-4 h-4" />Réinitialiser les données de démo</Button>
          </div>
        </div>
      </main>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader><DialogTitle className="text-foreground">Supprimer mon compte</DialogTitle><DialogDescription className="text-muted-foreground">Cette action est irréversible. Toutes tes données seront supprimées.</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Es-tu sûr de vouloir supprimer ton compte ? Cette action ne peut pas être annulée.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary h-11" onClick={() => setConfirmDelete(false)}>Annuler</Button>
              <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5 h-11" onClick={() => { deleteAccount(); setConfirmDelete(false) }}>Supprimer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
