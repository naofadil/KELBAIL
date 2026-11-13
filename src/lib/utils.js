import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Montant formaté en francs CFA, avec séparateurs de milliers. */
export const formatFCFA = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F CFA`

/** Nombre court : 1 200 -> « 1,2 k ». Utilisé pour les compteurs de participants. */
export const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')} k` : String(n))

export const CATEGORIES = [
  { value: 'kermesse', label: '🎪 Kermesse' },
  { value: 'nuit_culturelle', label: '🌙 Nuit Culturelle' },
  { value: 'soiree_boite', label: '🪩 Soirée Boîte de Nuit' },
  { value: 'concert', label: '🎵 Concert' },
  { value: 'festival', label: '🎭 Festival' },
  { value: 'autre', label: '✨ Autre' },
]

export const SEARCH_CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'kermesse', label: '🎪 Kermesse' },
  { value: 'nuit_culturelle', label: '🌙 Nuit Culturelle' },
  { value: 'soiree_boite', label: '🪩 Soirée' },
  { value: 'concert', label: '🎵 Concert' },
  { value: 'festival', label: '🎭 Festival' },
  { value: 'autre', label: '✨ Autre' },
]

export const categoryLabel = (value) => (value || '').replace('_', ' ')

/** Commission plateforme prélevée sur chaque billet vendu. */
export const PLATFORM_FEE_RATE = 0.05

/** Montant minimum d'un versement Mobile Money. */
export const MIN_PAYOUT = 5000

/**
 * État commercial d'un événement, utilisé pour les pastilles d'urgence.
 * S'inspire de ce que font Dice ou Shotgun : prévenir avant la rupture.
 */
export function eventStatus(event) {
  const total = event?.tickets_available || 0
  const sold = event?.tickets_sold || 0
  const remaining = Math.max(0, total - sold)
  const ratio = total ? sold / total : 0
  const past = event?.date ? new Date(event.date) < new Date() : false
  if (event?.status === 'annule') return { key: 'cancelled', label: 'Annulé', tone: 'destructive', remaining, ratio, past }
  if (past) return { key: 'past', label: 'Terminé', tone: 'muted', remaining, ratio, past }
  if (remaining === 0) return { key: 'soldout', label: 'Complet', tone: 'destructive', remaining, ratio, past }
  if (ratio >= 0.9) return { key: 'last', label: `Plus que ${remaining} places`, tone: 'accent', remaining, ratio, past }
  if (ratio >= 0.7) return { key: 'filling', label: 'Se remplit vite', tone: 'accent', remaining, ratio, past }
  return { key: 'open', label: null, tone: 'primary', remaining, ratio, past }
}

/** Libellé relatif court : « Aujourd'hui », « Demain », « Dans 3 jours ». */
export function relativeDay(date) {
  if (!date) return ''
  const d = new Date(date)
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(d) - start(new Date())) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  if (days > 1 && days <= 7) return `Dans ${days} jours`
  if (days === -1) return 'Hier'
  return ''
}
