import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { House, CirclePlus, QrCode, Ticket, User, Smartphone } from 'lucide-react'
import { api } from '@/api/client'
import { useCurrentUser } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { path: '/', icon: House, label: 'Accueil' },
  { path: '/vendre', icon: CirclePlus, label: 'Vendre' },
  { path: '/gestion', icon: QrCode, label: 'Gestion' },
  { path: '/billets', icon: Ticket, label: 'Billets' },
  { path: '/compte', icon: User, label: 'Compte' },
]

export default function BottomNav() {
  const location = useLocation()
  const { data: user } = useCurrentUser()
  const { data: staff } = useQuery({
    queryKey: ['staffMember', user?.email],
    queryFn: async () => (user?.email ? (await api.entities.StaffMember.filter({ staff_email: user.email }))[0] || null : null),
    enabled: !!user?.email,
  })
  const items = [...NAV_ITEMS]
  if (staff?.status === 'actif') items.push({ path: '/staff-scanner', icon: Smartphone, label: 'Scanner' })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {items.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all min-h-[44px] justify-center user-select-none ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <div className={`p-1.5 rounded-full transition-all ${active ? 'bg-primary/15' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
