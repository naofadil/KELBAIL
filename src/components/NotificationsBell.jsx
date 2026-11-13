import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/api/client'
import { useCurrentUser } from '@/hooks/useAuth'

export const NOTIFICATION_TYPES = {
  new_event: { label: '✨ Nouvel événement', color: 'bg-primary/10 text-primary' },
  ticket_reminder: { label: '⏰ Rappel billet', color: 'bg-accent/10 text-accent' },
  event_status_change: { label: "📢 Changement d'état", color: 'bg-chart-4/10 text-chart-4' },
  ticket_confirmation: { label: '✅ Confirmation', color: 'bg-green-500/10 text-green-600' },
  message: { label: '💬 Message', color: 'bg-chart-5/10 text-chart-5' },
  payout: { label: '💸 Versement', color: 'bg-primary/10 text-primary' },
  organizer: { label: '🏢 Organisateur', color: 'bg-accent/10 text-accent' },
}

export function useNotifications() {
  const { data: user } = useCurrentUser()
  return useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => (user?.email ? api.entities.Notification.filter({ user_email: user.email }, '-created_date') : []),
    enabled: !!user?.email,
    refetchInterval: 5000,
  })
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMutation({
    mutationFn: (id) => api.entities.Notification.update(id, { status: 'read' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const unread = notifications.filter((n) => n.status === 'unread').length

  const openNotif = (n) => {
    markRead.mutate(n.id)
    if (n.action_url) { setOpen(false); navigate(n.action_url) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors" aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {unread > 0 && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-xs font-bold text-white">{unread > 9 ? '9+' : unread}</div>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader><DialogTitle className="text-foreground">Notifications</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><Bell className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Aucune notification</p></div>
            ) : notifications.map((n) => {
              const t = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.new_event
              return (
                <button key={n.id} onClick={() => openNotif(n)} className={`w-full p-3 rounded-lg border transition-all text-left ${n.status === 'unread' ? 'bg-secondary/50 border-border/50 hover:border-primary/30' : 'bg-card border-border/30 hover:border-border/50 opacity-75'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${t.color}`}>{t.label}</p>
                      <p className="text-sm font-medium text-foreground mt-1">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">{format(new Date(n.created_date), 'd MMM à HH:mm', { locale: fr })}</p>
                    </div>
                    {n.status === 'unread' && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
