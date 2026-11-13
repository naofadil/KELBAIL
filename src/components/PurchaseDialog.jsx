import { useMemo, useState } from 'react'
import { Minus, Plus, Phone, Copy, LoaderCircle, CircleCheck, Check, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eventCountry, operatorsFor, ussdCode, countryFlag } from '@/lib/geo'
import { eventStatus } from '@/lib/utils'
import { MAX_TICKETS_PER_PERSON } from '@/api/client'

/** Numéro marchand Kel Bail, identique à celui de l'application d'origine. */
const MERCHANT = '5773017'

export default function PurchaseDialog({ open, onOpenChange, event, onConfirm, defaultName = '' }) {
  const [quantity, setQuantity] = useState(1)
  const [buyerName, setBuyerName] = useState(defaultName)
  const [step, setStep] = useState('details')
  const [sending, setSending] = useState(false)

  const country = eventCountry(event)
  const operators = useMemo(() => operatorsFor(country), [country])
  const [operator, setOperator] = useState(operators[0])

  const { remaining } = eventStatus(event)
  const maxQty = Math.max(1, Math.min(MAX_TICKETS_PER_PERSON, remaining))
  const total = (event?.ticket_price || 0) * quantity
  const code = ussdCode(operator, MERCHANT, total)

  const copy = () => { navigator.clipboard?.writeText(code); toast.success('Code copié !') }
  const dial = () => { window.location.href = `tel:${encodeURIComponent(code)}` }

  const confirmPayment = async () => {
    try {
      setSending(true)
      await onConfirm({ quantity, buyerName: buyerName.trim(), totalPrice: total, operator: operator.name, ussdCode: code })
      setStep('confirmed')
    } catch (e) {
      toast.error(e.message || "Erreur lors de l'envoi du billet")
    } finally { setSending(false) }
  }

  const close = () => {
    setStep('details'); setQuantity(1); setBuyerName(defaultName); setSending(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        {step === 'details' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Acheter des billets</DialogTitle>
              <DialogDescription className="text-muted-foreground">{event?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-foreground text-sm">Nom du participant</Label>
                <Input
                  value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ex: Amadou Diallo" className="mt-1.5 bg-secondary border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Ce nom sera vérifié à l'entrée. Le billet sera enregistré à ce nom sur votre compte.</p>
              </div>

              <div>
                <Label className="text-foreground text-sm">Nombre de billets</Label>
                <div className="flex items-center gap-4 mt-1.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                    className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-primary/10 transition-colors disabled:opacity-40"
                    aria-label="Retirer un billet"
                  ><Minus className="w-4 h-4" /></button>
                  <span className="text-2xl font-bold text-foreground w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty}
                    className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-primary/10 transition-colors disabled:opacity-40"
                    aria-label="Ajouter un billet"
                  ><Plus className="w-4 h-4" /></button>
                  <span className="text-xs text-muted-foreground">
                    {remaining <= 10 ? `${remaining} place(s) restantes` : `max. ${MAX_TICKETS_PER_PERSON} par personne`}
                  </span>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{quantity} × billet</span>
                  <span>{event?.ticket_price?.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between font-bold text-foreground text-lg border-t border-border/50 pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">{total.toLocaleString('fr-FR')} F CFA</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Aucun frais de service ajouté.</p>
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold rounded-xl"
                onClick={() => setStep('payment')} disabled={!buyerName.trim()}
              >
                Continuer vers le paiement
              </Button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Paiement Mobile Money</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Opérateurs disponibles {country ? `${countryFlag(country)} ${country}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2">
                {operators.map((op) => (
                  <button
                    key={op.name} onClick={() => setOperator(op)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      operator.name === op.name ? 'bg-primary/10 border-primary/40 text-foreground' : 'bg-secondary border-border/50 text-muted-foreground'
                    }`}
                  >
                    <span className={`truncate ${operator.name === op.name ? op.color : ''}`}>{op.name}</span>
                    {operator.name === op.name && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="bg-secondary rounded-2xl p-5 text-center border border-border/50">
                <Phone className="w-9 h-9 text-primary mx-auto mb-3" />
                <p className="text-xs text-muted-foreground mb-2">Composez ce code {operator.name} :</p>
                <div className="bg-background rounded-xl p-4 border border-primary/30">
                  <p className="text-xl font-mono font-bold text-primary tracking-wider break-all">{code}</p>
                </div>
                <div className="flex gap-2 justify-center mt-4">
                  <button onClick={copy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium">
                    <Copy className="w-4 h-4" />Copier
                  </button>
                  <button onClick={dial} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium">
                    <Phone className="w-4 h-4" />Composer
                  </button>
                </div>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-xs text-accent">
                <p className="font-semibold mb-1">Instructions :</p>
                <ol className="list-decimal list-inside space-y-0.5 text-accent/80">
                  <li>Compose le code sur le numéro lié à ton compte {operator.name}</li>
                  <li>Valide le paiement de {total.toLocaleString('fr-FR')} F CFA</li>
                  <li>Reviens ici et confirme</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-secondary h-11 rounded-xl" onClick={() => setStep('details')}>
                  Retour
                </Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold" onClick={confirmPayment} disabled={sending}>
                  {sending ? <><LoaderCircle className="w-4 h-4 animate-spin mr-2" />Génération...</> : "J'ai payé ✓"}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'confirmed' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <CircleCheck className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Billet confirmé ! 🎉</h3>
            <p className="text-sm text-muted-foreground mb-1">
              {quantity} billet{quantity > 1 ? 's' : ''} pour « {event?.title} »
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-4 mb-4 text-left">
              <p className="text-xs text-primary flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Ton QR code d'admission est disponible dans l'onglet Billets. Il n'est valable qu'une seule fois.
              </p>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold"
              onClick={() => { close(); window.location.href = '/billets' }}
            >
              Voir mes billets
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
