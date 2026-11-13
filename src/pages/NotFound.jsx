import { Link, useLocation } from 'react-router-dom'
import { House } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const path = useLocation().pathname
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2"><h1 className="text-7xl font-light text-muted-foreground/40">404</h1><div className="h-0.5 w-16 bg-border mx-auto" /></div>
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-foreground">Page introuvable</h2>
          <p className="text-muted-foreground leading-relaxed">La page <span className="font-medium text-foreground">« {path} »</span> n'existe pas sur Kel Bail.</p>
        </div>
        <Link to="/" className="inline-block"><Button variant="outline" className="border-border text-foreground hover:bg-secondary rounded-xl"><House className="w-4 h-4 mr-2" />Retour à l'accueil</Button></Link>
      </div>
    </div>
  )
}
