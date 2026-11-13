import { useEffect, useRef, useState } from 'react'
import { X, Download, Share2, Flag, Sun, ArrowRightLeft, ChevronDown, ChevronUp, User } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/api/client'

export default function TicketDialog({ open, onOpenChange, ticket, event }) {
  const qc = useQueryClient()
  const [qr, setQr] = useState(null)
  const [brightMode, setBrightMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [newOwner, setNewOwner] = useState({ name: '', email: '' })
  const wakeLockRef = useRef(null)

  // Charger le QR à l'ouverture
  useEffect(() => {
    if (!open || !ticket) return
    setQr(ticket.qr_code_url || null)
    setBrightMode(false)
    setShowHistory(false)
    setShowTransfer(false)
    if (!ticket.qr_code_url) {
      api.functions.invoke('sendTicketEmail', { ticketId: ticket.id })
        .then((r) => r.data?.qr_code_url && setQr(r.data.qr_code_url))
        .catch(() => {})
    }
    return () => releaseBrightMode()
  }, [open, ticket])

  // Désactiver le mode lumineux à la fermeture
  useEffect(() => {
    if (!open) releaseBrightMode()
  }, [open])

  async function activateBrightMode() {
    setBrightMode(true)
    // Screen Wake Lock : empêche le téléphone de s'endormir pendant le scan
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch {}
    }
  }

  function releaseBrightMode() {
    setBrightMode(false)
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }

  const transfer = useMutation({
    mutationFn: () => api.ops.transferTicket({ ticketId: ticket.id, newOwnerName: newOwner.name, newOwnerEmail: newOwner.email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myTickets'] })
      toast.success('Billet transféré avec succès')
      setShowTransfer(false)
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })

  if (!ticket || !event) return null

  const isActive = ticket.status === 'confirme'
  const history = ticket.transfer_history || []

  const download = () => { toast.success('Préparation du PDF...'); setTimeout(() => window.print(), 300) }
  const share = () => {
    const text = `🎫 Je vais à "${event.title}" le ${event.date ? format(new Date(event.date), 'd MMM yyyy', { locale: fr }) : ''}\n${event.location}, ${event.city}\n\nRéserve sur Kel Bail !`
    if (navigator.share) navigator.share({ text })
    else { navigator.clipboard?.writeText(text); toast.success('Message copié !') }
  }
  const report = () => {
    window.dispatchEvent(new CustomEvent('openFraudReport', { detail: { ticket, event } }))
    onOpenChange(false)
  }

  return (
    <>
      {/* Overlay blanc plein écran pour maximiser la luminosité lors du scan */}
      {brightMode && (
        <div
          className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center"
          onClick={releaseBrightMode}
        >
          <div className="text-black text-xs mb-4 font-medium opacity-60">Appuie pour fermer</div>
          {qr && (
            <div className="bg-white p-6 rounded-3xl shadow-2xl">
              <img src={qr} alt="QR Code" className="w-72 h-72" style={{ imageRendering: 'pixelated' }} />
            </div>
          )}
          <p className="text-black font-mono font-bold text-lg mt-6 tracking-widest">{ticket.ticket_code}</p>
          <p className="text-black/60 text-sm mt-2">{ticket.buyer_name}</p>
        </div>
      )}

      <Dialog open={open && !brightMode} onOpenChange={onOpenChange}>
        <DialogContent hideClose className="bg-card border-border max-w-sm mx-auto p-0 overflow-hidden">
          <DialogTitle className="sr-only">Billet {ticket.ticket_code}</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background transition-colors"
          ><X className="w-4 h-4" /></button>

          <div id="print-ticket">
            {/* En-tête événement */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-6 text-center border-b border-border">
              <h2 className="text-lg font-bold text-foreground mb-1">{event.title}</h2>
              <p className="text-sm text-muted-foreground">
                {event.date ? format(new Date(event.date), 'd MMM yyyy à HH:mm', { locale: fr }) : ''}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Titulaire du billet */}
              <div className="bg-secondary/60 rounded-xl p-3.5 flex items-center gap-3 border border-border/40">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Titulaire du billet</p>
                  <p className="text-sm font-semibold text-foreground truncate">{ticket.buyer_name}</p>
                  {history.length > 0 && (
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1 text-xs text-primary mt-0.5"
                    >
                      {history.length} transfert{history.length > 1 ? 's' : ''}
                      {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Historique de transferts */}
              {showHistory && history.length > 0 && (
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="bg-secondary/40 rounded-lg p-3 text-xs border border-border/30">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium text-foreground">{h.from_name}</span>
                        <ArrowRightLeft className="w-3 h-3" />
                        <span className="font-medium text-foreground">{h.to_name}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {format(new Date(h.transferred_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Code billet */}
              <div className="bg-secondary rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Code du billet</p>
                <p className="text-xl font-mono font-bold text-primary text-center tracking-wider">{ticket.ticket_code}</p>
              </div>

              {/* QR code + bouton luminosité max */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Code QR d'admission</p>
                  {isActive && qr && (
                    <button
                      onClick={activateBrightMode}
                      className="flex items-center gap-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-accent/20 transition-colors print:hidden"
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Plein écran
                    </button>
                  )}
                </div>
                <div
                  className={`rounded-2xl p-5 border-2 flex items-center justify-center transition-colors ${
                    isActive ? 'border-primary/30 bg-white' : 'border-border bg-secondary/50'
                  }`}
                >
                  {qr ? (
                    <div className="text-center space-y-2">
                      <img
                        src={qr} alt="QR Code"
                        className="w-48 h-48 rounded-lg"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      {isActive && <p className="text-xs text-green-600 font-medium">✓ QR Code flashable</p>}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-3xl mb-2">📱</p>
                      <p className="text-xs text-muted-foreground">Chargement du QR Code...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Infos */}
              <div className="space-y-3">
                <div><p className="text-xs text-muted-foreground mb-1">📍 Lieu</p><p className="text-sm font-medium text-foreground">{event.location}</p><p className="text-xs text-muted-foreground">{event.city}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">🎫 Quantité</p><p className="text-sm font-medium text-foreground">{ticket.quantity} billet{ticket.quantity > 1 ? 's' : ''}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">💰 Montant payé</p><p className="text-sm font-bold text-primary">{ticket.total_price?.toLocaleString('fr-FR')} FCFA</p></div>
              </div>

              {/* Statut */}
              <div className={`border rounded-lg p-3 ${
                ticket.status === 'utilise' ? 'bg-muted border-border'
                : ticket.status === 'annule' ? 'bg-destructive/10 border-destructive/20'
                : 'bg-primary/10 border-primary/20'
              }`}>
                <p className={`text-xs font-medium text-center ${
                  ticket.status === 'utilise' ? 'text-muted-foreground'
                  : ticket.status === 'annule' ? 'text-destructive'
                  : 'text-primary'
                }`}>
                  {ticket.status === 'utilise' ? '🎟️ Billet déjà utilisé'
                    : ticket.status === 'annule' ? '❌ Billet annulé'
                    : ticket.status === 'en_attente' ? '⏳ En attente de confirmation du paiement'
                    : "✅ Billet confirmé et prêt à l'emploi"}
                </p>
              </div>

              {/* Transfert */}
              {isActive && (
                <div className="pt-1 print:hidden">
                  {showTransfer ? (
                    <div className="bg-secondary/60 rounded-xl p-4 space-y-3 border border-border/50">
                      <p className="text-sm font-semibold text-foreground">Transférer ce billet</p>
                      <Input
                        placeholder="Nom du nouveau titulaire"
                        value={newOwner.name}
                        onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                        className="bg-background border-border text-foreground"
                      />
                      <Input
                        placeholder="Email (optionnel)"
                        type="email"
                        value={newOwner.email}
                        onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                        className="bg-background border-border text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">Le billet sera re-enregistré au nom du nouveau titulaire. L'historique est conservé.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 border-border text-foreground h-10" onClick={() => setShowTransfer(false)}>Annuler</Button>
                        <Button
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                          onClick={() => transfer.mutate()}
                          disabled={!newOwner.name.trim() || transfer.isPending}
                        >
                          {transfer.isPending ? 'Transfert...' : 'Confirmer'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-border text-foreground hover:bg-secondary h-11 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => setShowTransfer(true)}
                    >
                      <ArrowRightLeft className="w-4 h-4" />Transférer ce billet
                    </Button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 print:hidden">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center justify-center gap-2" onClick={download}>
                  <Download className="w-4 h-4" />Télécharger en PDF
                </Button>
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary h-11 rounded-xl font-semibold flex items-center justify-center gap-2" onClick={share}>
                  <Share2 className="w-4 h-4" />Partager
                </Button>
                <Button variant="outline" className="w-full border-destructive/20 text-destructive hover:bg-destructive/5 h-11 rounded-xl font-semibold flex items-center justify-center gap-2" onClick={report}>
                  <Flag className="w-4 h-4" />Signaler une fraude
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Billet enregistré au nom de {ticket.buyer_name}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
