import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Zap, CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import ManualCodeInput from '@/components/ManualCodeInput'
import QrScanner from '@/components/QrScanner'
import ScanResult from '@/components/ScanResult'
import { useRequireAuth } from '@/hooks/useAuth'

export default function StaffScanner() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [eventId, setEventId] = useState(null)
  const { user } = useRequireAuth()

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staffMember', user?.email],
    queryFn: async () => (await api.entities.StaffMember.filter({ staff_email: user.email }))[0] || null,
    enabled: !!user?.email,
  })
  const { data: events = [] } = useQuery({
    queryKey: ['organizerEvents', staff?.organizer_email],
    queryFn: () => api.entities.Event.filter({ organizer_email: staff.organizer_email }, '-created_date'),
    enabled: !!staff?.organizer_email,
  })
  const allowed = events.filter((e) => !staff?.events || staff.events.length === 0 || staff.events.includes(e.id))

  const scan = useMutation({
    mutationFn: (code) => api.ops.validateTicket({ code, eventId }),
    onSuccess: (r) => { setResult(r); if (r.status === 'valid') setTimeout(() => setResult(null), 3000) },
    onError: (e) => { setResult({ status: 'invalid', message: e.message }); toast.error(e.message) },
  })

  if (!user || isLoading) return null
  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <CircleAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Accès refusé. Vous n'êtes pas autorisé à scanner les billets.</p>
          <Button onClick={() => navigate('/')} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">Retour à l'accueil</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-foreground">Scanner de billets</h1><p className="text-xs text-muted-foreground">Staff: {user.full_name}</p></div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {allowed.length > 0 && (
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">Sélectionne un événement</label>
            <div className="grid gap-2">
              {allowed.map((e) => (
                <button key={e.id} onClick={() => { setEventId(e.id); setResult(null) }} className={`p-3 rounded-xl border transition-all text-left ${eventId === e.id ? 'bg-primary/10 border-primary/40' : 'bg-card border-border/50 hover:border-primary/20'}`}>
                  <p className="font-semibold text-foreground text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(e.date).toLocaleDateString('fr-FR')}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        {eventId && (
          <>
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3"><Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" /><p className="text-sm text-accent">Scanne le code QR ou saisis manuellement le code du billet.</p></div>
            <QrScanner onDetected={(c) => scan.mutate(c)} disabled={scan.isPending} />
            <ManualCodeInput onSubmit={(c) => scan.mutate(c)} isLoading={scan.isPending} />
            {result && <ScanResult status={result.status} ticket={result.ticket} message={result.message} />}
          </>
        )}
        {allowed.length === 0 && <div className="text-center py-8 text-muted-foreground"><p>Aucun événement autorisé</p></div>}
      </main>
    </div>
  )
}
