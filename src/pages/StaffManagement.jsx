import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, CircleCheck, CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRequireAuth, useOrganizerProfile } from '@/hooks/useAuth'

export default function StaffManagement() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', name: '' })
  const { user } = useRequireAuth()
  const { data: organizer, isLoading } = useOrganizerProfile(user)
  const { data: members = [] } = useQuery({
    queryKey: ['staffMembers', user?.email],
    queryFn: () => api.entities.StaffMember.filter({ organizer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  })

  const add = useMutation({
    mutationFn: async (m) => {
      await api.entities.StaffMember.create({ organizer_email: user.email, staff_email: m.email.trim().toLowerCase(), staff_name: m.name.trim(), role: 'scanner', status: 'actif', events: [] })
      await api.entities.Notification.create({ user_email: m.email.trim().toLowerCase(), type: 'organizer', status: 'unread', title: 'Tu as été ajouté au staff', message: `${organizer.company_name} t'autorise à scanner les billets.`, action_url: '/staff-scanner' })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffMembers'] }); qc.invalidateQueries({ queryKey: ['staffMember'] }); toast.success('Membre du staff ajouté'); setOpen(false); setForm({ email: '', name: '' }) },
    onError: () => toast.error("Erreur lors de l'ajout du membre"),
  })
  const remove = useMutation({
    mutationFn: (id) => api.entities.StaffMember.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffMembers'] }); toast.success('Membre du staff supprimé') },
  })

  if (!user || isLoading) return null
  if (!organizer) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center px-6"><CircleAlert className="w-12 h-12 text-destructive mx-auto mb-4" /><p className="text-muted-foreground">Vous devez avoir un profil organisateur pour accéder à cette page</p></div></div>
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profil-organisateur')} className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="text-lg font-bold text-foreground">Gestion du staff</h1><p className="text-xs text-muted-foreground">{members.length} membre(s)</p></div>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-3 rounded-lg" size="sm"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5">
        {members.length === 0 ? (
          <div className="text-center py-12"><p className="text-4xl mb-3">👥</p><p className="text-muted-foreground">Aucun membre du staff. Ajoutes-en un pour autoriser le scan de billets.</p></div>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{m.staff_name}</h3>{m.status === 'actif' && <CircleCheck className="w-4 h-4 text-primary" />}</div>
                  <p className="text-sm text-muted-foreground">{m.staff_email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{!m.events || m.events.length === 0 ? 'Tous les événements' : `${m.events.length} événement(s)`}</p>
                </div>
                <button onClick={() => remove.mutate(m.id)} className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center" disabled={remove.isPending}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader><DialogTitle className="text-foreground">Ajouter un membre du staff</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><label className="text-sm text-muted-foreground mb-1 block">Nom</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Ali Diallo" className="bg-secondary border-border text-foreground" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Ex: staff@example.com" className="bg-secondary border-border text-foreground" /></div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>Annuler</Button>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { if (!form.name || !form.email) { toast.error('Veuillez remplir tous les champs'); return } add.mutate(form) }} disabled={add.isPending}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
