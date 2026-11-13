import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, User, ChevronRight, Settings, Users, CalendarDays, Bell, Heart, Wallet, MessageSquare, CircleHelp, Info, LogOut, LogIn } from 'lucide-react'
import { api } from '@/api/client'
import NotificationsBell from '@/components/NotificationsBell'
import { useCurrentUser } from '@/hooks/useAuth'

const MENU = [
  { icon: Settings, label: 'Compte', desc: 'Paramètres de ton compte', path: '/compte/parametres' },
  { icon: Users, label: 'Profil Organisateur', desc: 'Gérer ton profil organisateur', path: '/profil-organisateur' },
  { icon: CalendarDays, label: 'Ton calendrier', path: '/compte/calendrier' },
  { icon: Bell, label: 'Alertes billets', path: '/compte/alertes' },
  { icon: Heart, label: 'Tes événements favoris', path: '/compte/favoris' },
  { icon: Wallet, label: 'Versements', path: '/compte/versements' },
  { icon: MessageSquare, label: 'Conversations', path: '/compte/conversations' },
  { icon: CircleHelp, label: "Obtenir de l'aide", path: '/compte/aide' },
  { icon: Info, label: 'À propos', path: '/compte/apropos' },
]

export default function Account() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: pending = [] } = useQuery({
    queryKey: ['pendingTickets', user?.email],
    queryFn: () => api.entities.Ticket.filter({ buyer_email: user.email, status: 'en_attente' }),
    enabled: !!user?.email,
  })

  return (
    <div className="min-h-screen">
      <header className="bg-background px-4 pt-4 pb-2">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-end gap-3 mb-6">
            <button onClick={() => navigate('/billets')} className="relative w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Billets en attente">
              <ShoppingCart className="w-5 h-5" />
              {pending.length > 0 && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">{pending.length}</div>}
            </button>
            <NotificationsBell />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-6">Compte</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 space-y-1">
        <Link to={user ? '/compte/profil' : '/connexion?from=/compte'} className="w-full flex items-center gap-3 py-4 border-b border-border/30 hover:bg-card/50 transition-colors rounded-lg px-2">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">{user?.full_name || 'Utilisateur'}</p>
            <p className="text-sm text-muted-foreground">{user ? 'Ton profil social' : 'Connecte-toi ou crée un compte'}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="space-y-0.5 pt-2">
          {MENU.map(({ icon: Icon, label, desc, path }) => (
            <Link key={label} to={path} className="w-full flex items-center gap-3 py-3.5 hover:bg-card/50 transition-colors rounded-lg px-2">
              <div className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center"><Icon className="w-4.5 h-4.5 text-muted-foreground" /></div>
              <div className="flex-1 text-left"><p className="font-medium text-foreground text-sm">{label}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>
              <ChevronRight className="w-4.5 h-4.5 text-muted-foreground/50" />
            </Link>
          ))}
        </div>
        {user?.role === 'admin' && (
          <div className="pt-4 border-t border-border/30">
            <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 py-3.5 hover:bg-primary/5 transition-colors rounded-lg px-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Settings className="w-4.5 h-4.5 text-primary" /></div>
              <span className="font-medium text-primary text-sm">🔐 Tableau de Bord Admin</span>
            </button>
          </div>
        )}
        <div className="pt-4 pb-8">
          {user ? (
            <button onClick={() => api.auth.logout('/')} className="w-full flex items-center gap-3 py-3.5 hover:bg-destructive/5 transition-colors rounded-lg px-2">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center"><LogOut className="w-4.5 h-4.5 text-destructive" /></div>
              <span className="font-medium text-destructive text-sm">Déconnexion</span>
            </button>
          ) : (
            <button onClick={() => navigate('/connexion?from=/compte')} className="w-full flex items-center gap-3 py-3.5 hover:bg-primary/5 transition-colors rounded-lg px-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><LogIn className="w-4.5 h-4.5 text-primary" /></div>
              <span className="font-medium text-primary text-sm">Se connecter / Créer un compte</span>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
