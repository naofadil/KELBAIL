import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** En-tête collant des sous-pages (retour + titre + sous-titre). */
export default function SubPageHeader({ title, subtitle, backTo = '/compte', right = null, wide = false }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
      <div className={`${wide ? 'max-w-2xl' : 'max-w-lg'} mx-auto px-4 py-4 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => (backTo === -1 ? navigate(-1) : navigate(backTo))}
            className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors flex-shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </header>
  )
}
