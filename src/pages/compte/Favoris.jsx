import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import SubPageHeader from '@/components/SubPageHeader'
import EventCard from '@/components/EventCard'
import { useRequireAuth } from '@/hooks/useAuth'

export default function Favoris() {
  const { user } = useRequireAuth()
  const { data: favorites = [], isLoading } = useQuery({ queryKey: ['favorites', user?.email], queryFn: () => api.entities.Favorite.filter({ user_email: user.email }, '-created_date'), enabled: !!user?.email })
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 100) })
  const list = favorites.map((f) => events.find((e) => e.id === f.event_id)).filter(Boolean)
  if (!user) return null
  return (
    <div className="min-h-screen">
      <SubPageHeader title="Tes événements favoris" subtitle={`${list.length} événement${list.length > 1 ? 's' : ''} aimé${list.length > 1 ? 's' : ''}`} />
      <main className="max-w-lg mx-auto px-4 py-5">
        {isLoading ? <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="animate-pulse bg-card rounded-2xl h-64 border border-border/50" />)}</div>
          : list.length === 0 ? (
            <div className="text-center py-12"><p className="text-4xl mb-3">❤️</p><p className="text-muted-foreground">Aucun favori pour le moment</p><p className="text-xs text-muted-foreground mt-1">Appuie sur le cœur d'un événement pour le retrouver ici.</p><Link to="/recherche" className="inline-block mt-4 text-sm text-primary font-semibold hover:underline">Explorer les événements</Link></div>
          ) : <div className="grid gap-4">{list.map((e) => <EventCard key={e.id} event={e} />)}</div>}
      </main>
    </div>
  )
}
