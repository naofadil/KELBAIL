import { useState } from 'react'
import { TriangleAlert, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { api } from '@/api/client'

export const FRAUD_TYPES = [
  { value: 'duplicate_use', label: 'Billet utilisé deux fois' },
  { value: 'fake_organizer', label: 'Organisateur frauduleux' },
  { value: 'suspicious_activity', label: 'Activité suspecte' },
  { value: 'other', label: 'Autre' },
]

export default function FraudReportDialog({ open, onOpenChange, ticket, event }) {
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!type || !description.trim()) { toast.error('Remplis tous les champs'); return }
    setSending(true)
    try {
      const me = await api.auth.me()
      await api.entities.FraudReport.create({
        reporter_email: me.email, ticket_id: ticket?.id, event_id: event?.id, type, description: description.trim(), status: 'reported',
      })
      toast.success('Signalement envoyé. Merci de nous aider à sécuriser Kel Bail !')
      setType(''); setDescription(''); onOpenChange(false)
    } catch {
      toast.error('Erreur lors du signalement')
    } finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground"><TriangleAlert className="w-5 h-5 text-destructive" />Signaler une fraude</DialogTitle>
          <DialogDescription className="text-muted-foreground">Aide-nous à sécuriser la plateforme Kel Bail</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-foreground font-medium mb-1.5 block">Type de fraude</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Sélectionne le type" /></SelectTrigger>
              <SelectContent>{FRAUD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-foreground font-medium mb-1.5 block">Description détaillée</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explique en détail ce qui te semble frauduleux..." className="bg-secondary border-border text-foreground h-28" />
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3"><p className="text-xs text-destructive">⚠️ Les fausses signalations peuvent entraîner une suspension de compte.</p></div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary h-10 rounded-lg" onClick={() => onOpenChange(false)} disabled={sending}>Annuler</Button>
            <Button className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 rounded-lg font-semibold flex items-center justify-center gap-2" onClick={submit} disabled={sending || !type || !description.trim()}>
              {sending ? <><LoaderCircle className="w-4 h-4 animate-spin" />Envoi...</> : 'Signaler'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
