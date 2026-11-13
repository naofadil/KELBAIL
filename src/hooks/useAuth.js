import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/api/client'

/** Utilisateur courant (null si non connecté) — ne lève jamais d'erreur. */
export function useCurrentUser() {
  const qc = useQueryClient()
  useEffect(() => {
    const handler = () => qc.invalidateQueries({ queryKey: ['currentUser'] })
    window.addEventListener('kelbail:auth', handler)
    return () => window.removeEventListener('kelbail:auth', handler)
  }, [qc])
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try { return await api.auth.me() } catch { return null }
    },
    staleTime: 60_000,
  })
}

/** Redirige vers /connexion si l'utilisateur n'est pas connecté. */
export function useRequireAuth() {
  const { data: user, isLoading } = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/connexion?from=${encodeURIComponent(location.pathname)}`, { replace: true })
    }
  }, [user, isLoading, navigate, location.pathname])
  return { user, isLoading }
}

/** Profil organisateur de l'utilisateur courant. */
export function useOrganizerProfile(user) {
  return useQuery({
    queryKey: ['organizerProfile', user?.email],
    queryFn: async () => (user?.email ? (await api.entities.Organizer.filter({ user_email: user.email }))[0] || null : null),
    enabled: !!user?.email,
  })
}
