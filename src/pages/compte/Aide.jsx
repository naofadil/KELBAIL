import { useState } from 'react'
import { ChevronDown, MessageCircle, Mail, Send, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import SubPageHeader from '@/components/SubPageHeader'
import { useCurrentUser } from '@/hooks/useAuth'
import { SEED_FAQ } from '@/api/seed'

const SUPPORT_WHATSAPP = '22890000000'
const SUPPORT_EMAIL = 'support@kelbail.com'

export default function Aide() {
  const { data: user } = useCurrentUser()
  const [openIdx, setOpenIdx] = useState(null)
  const [form, setForm] = useState({ email: user?.email || '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setSending(true)
    try {
      await api.entities.SupportRequest.create({ email: form.email || user?.email, subject: form.subject, message: form.message, status: 'ouvert' })
      toast.success('Message envoyé ! Réponse sous 24 h.')
      setForm({ email: user?.email || '', subject: '', message: '' })
    } catch { toast.error("Erreur lors de l'envoi") } finally { setSending(false) }
  }

  return (
    <div className="min-h-screen">
      <SubPageHeader title="Obtenir de l'aide" subtitle="Support et FAQ" />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Bonjour Kel Bail, j’ai besoin d’aide.')}`} target="_blank" rel="noopener noreferrer" className="bg-card border border-border/50 rounded-xl p-4 text-center hover:border-primary/30 transition-colors"><MessageCircle className="w-6 h-6 text-primary mx-auto mb-2" /><p className="text-sm font-semibold text-foreground">WhatsApp</p><p className="text-xs text-muted-foreground">Réponse rapide</p></a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="bg-card border border-border/50 rounded-xl p-4 text-center hover:border-primary/30 transition-colors"><Mail className="w-6 h-6 text-accent mx-auto mb-2" /><p className="text-sm font-semibold text-foreground">Email</p><p className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</p></a>
        </div>
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">Questions fréquentes</h2>
          <div className="space-y-2">
            {SEED_FAQ.map((f, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between gap-3 p-4 text-left"><span className="text-sm font-medium text-foreground">{f.q}</span><ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} /></button>
                {openIdx === i && <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
        <form onSubmit={submit} className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Nous écrire</h2>
          {!user && <div><Label className="text-foreground text-sm">Ton email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 bg-secondary border-border text-foreground" /></div>}
          <div><Label className="text-foreground text-sm">Sujet</Label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex: Je n'ai pas reçu mon billet" className="mt-1.5 bg-secondary border-border text-foreground" /></div>
          <div><Label className="text-foreground text-sm">Message</Label><Textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Décris ton problème..." className="mt-1.5 bg-secondary border-border text-foreground h-28" /></div>
          <Button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center gap-2">{sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Envoyer</Button>
        </form>
      </main>
    </div>
  )
}
