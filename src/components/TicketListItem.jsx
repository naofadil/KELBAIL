import { CircleCheck, Clock, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS = {
  utilise: { icon: CircleCheck, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Utilisé' },
  en_attente: { icon: Clock, color: 'text-accent', bg: 'bg-accent/10', label: 'En attente' },
  confirme: { icon: CircleCheck, color: 'text-primary', bg: 'bg-primary/10', label: 'Confirmé' },
  annule: { icon: X, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Annulé' },
}

export default function TicketListItem({ ticket, event, onRemove }) {
  const s = STATUS[ticket.status] || STATUS.en_attente
  const Icon = s.icon
  return (
    <div className={`${s.bg} border border-border/50 rounded-xl p-3.5 relative`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 ${s.color}`} /><span className={`text-xs font-semibold ${s.color}`}>{s.label}</span></div>
          <h4 className="font-semibold text-foreground text-sm line-clamp-1">{event?.title || 'Événement'}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{ticket.buyer_name} • {ticket.quantity}x billet</p>
          <p className="text-xs font-mono text-muted-foreground mt-1 tracking-wider">{ticket.ticket_code}</p>
        </div>
        {onRemove && <button onClick={onRemove} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"><X className="w-4 h-4" /></button>}
      </div>
      {ticket.status === 'utilise' && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">Validé le {format(new Date(ticket.updated_date), 'd MMM à HH:mm', { locale: fr })}</p>
      )}
    </div>
  )
}
