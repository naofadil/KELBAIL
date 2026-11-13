import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { COUNTRIES, getCountry, dialCode } from '@/lib/geo'

/** Page de connexion / inscription (remplace l'écran d'auth hébergé par Base44). */
export default function Login() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const from = params.get('from') || '/'
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', city: '', country: '' })
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const cities = getCountry(form.country)?.cities || []
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') await api.auth.login({ email: form.email, password: form.password })
      else await api.auth.register(form)
      await qc.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success(mode === 'login' ? 'Content de te revoir 👋' : 'Bienvenue sur Kel Bail 🎉')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative overflow-hidden pt-10 pb-6 text-center">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at center, hsl(168 80% 50% / 0.15) 0%, transparent 70%)' }} />
        <img src="/logo.png" alt="Kel Bail" className="w-20 h-20 mx-auto mb-3 relative z-10 drop-shadow-2xl" />
        <h1 className="text-3xl font-black text-foreground tracking-tight relative z-10">Kel Bail</h1>
        <p className="text-sm text-muted-foreground mt-1 relative z-10">Billets d'événements</p>
      </div>
      <main className="max-w-lg mx-auto w-full px-4 pb-10 flex-1">
        <div className="grid grid-cols-2 bg-card border border-border/50 rounded-xl p-1 mb-6">
          {[['login', 'Connexion'], ['register', 'Créer un compte']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className={`py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}>{l}</button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <Label className="text-foreground text-sm">Nom complet *</Label>
              <div className="relative mt-1.5"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Ex: Amadou Diallo" required className="pl-10 bg-secondary border-border text-foreground" /></div>
            </div>
          )}
          <div>
            <Label className="text-foreground text-sm">Email *</Label>
            <div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="toi@exemple.com" required autoComplete="email" className="pl-10 bg-secondary border-border text-foreground" /></div>
          </div>
          <div>
            <Label className="text-foreground text-sm">Mot de passe *</Label>
            <div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input type={show ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="pl-10 pr-10 bg-secondary border-border text-foreground" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Masquer' : 'Afficher'}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'register' && <p className="text-xs text-muted-foreground mt-1">8 caractères minimum.</p>}
          </div>
          {mode === 'register' && (
            <>
              <div>
                <Label className="text-foreground text-sm">Pays</Label>
                <Select value={form.country} onValueChange={(v) => { set('country', v); set('city', '') }}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border text-foreground"><SelectValue placeholder="Choisir ton pays" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground text-sm">Ville</Label>
                  <Input list="login-cities" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder={cities[0] || 'Lomé'} className="mt-1.5 bg-secondary border-border text-foreground" />
                  <datalist id="login-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <Label className="text-foreground text-sm">Téléphone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder={dialCode(form.country)} className="pl-10 bg-secondary border-border text-foreground" />
                  </div>
                </div>
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl text-base font-bold mt-2">
            {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-6">
          En continuant, tu acceptes les <Link to="/compte/apropos" className="text-primary hover:underline">conditions d'utilisation</Link> de Kel Bail.
        </p>
        <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground mt-4">← Continuer sans compte</Link>
      </main>
    </div>
  )
}
