import { CircleCheck, CircleAlert, Clock } from 'lucide-react'

const RESULT = {
  valid: { icon: CircleCheck, color: 'bg-green-500/15 border-green-500/30', textColor: 'text-green-600', label: '✓ Billet valide', bgGlow: 'bg-green-500/5' },
  invalid: { icon: CircleAlert, color: 'bg-destructive/15 border-destructive/30', textColor: 'text-destructive', label: '✗ Billet invalide', bgGlow: 'bg-destructive/5' },
  used: { icon: CircleAlert, color: 'bg-destructive/15 border-destructive/30', textColor: 'text-destructive', label: '⚠️ Billet déjà utilisé', bgGlow: 'bg-destructive/5' },
  pending: { icon: Clock, color: 'bg-accent/15 border-accent/30', textColor: 'text-accent', label: '⏳ En attente de confirmation', bgGlow: 'bg-accent/5' },
}

export default function ScanResult({ status, ticket, message }) {
  if (!status) return null
  const r = RESULT[status]
  const Icon = r.icon
  return (
    <div className={`mt-6 rounded-2xl border-2 ${r.color} p-6 ${r.bgGlow}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-full ${r.color} flex items-center justify-center`}><Icon className={`w-8 h-8 ${r.textColor}`} /></div>
        <div><p className={`text-lg font-bold ${r.textColor}`}>{r.label}</p><p className="text-sm text-muted-foreground mt-1">{message}</p></div>
      </div>
      {ticket && (
        <div className="bg-card/50 rounded-lg p-4 space-y-2 border border-border/30 mt-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Acheteur</p><p className="font-medium text-foreground">{ticket.buyer_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Quantité</p><p className="font-medium text-foreground">{ticket.quantity} billet(s)</p></div>
          </div>
          <div><p className="text-xs text-muted-foreground">Code</p><p className="font-mono text-sm text-primary">{ticket.ticket_code}</p></div>
        </div>
      )}
    </div>
  )
}
