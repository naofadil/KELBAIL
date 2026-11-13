import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Upload, LoaderCircle, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import LocationPicker from '@/components/LocationPicker'
import { useCurrentUser, useOrganizerProfile } from '@/hooks/useAuth'
import { CATEGORIES, PLATFORM_FEE_RATE } from '@/lib/utils'
import { COUNTRIES, getCountry } from '@/lib/geo'

const EMPTY = {
  title: '', description: '', category: '', date: '', location: '', city: '', country: '',
  ticket_price: '', tickets_available: '', organizer_name: '', latitude: null, longitude: null,
}

/** Date minimale sélectionnable : maintenant, au format attendu par l'input. */
const minDateTime = () => {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

export default function Sell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: user } = useCurrentUser()
  const { data: organizer } = useOrganizerProfile(user)
  const approved = organizer?.status === 'approuve'

  const [form, setForm] = useState(() => ({ ...EMPTY, country: user?.country || '' }))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const cities = useMemo(() => getCountry(form.country)?.cities || [], [form.country])

  const create = useMutation({
    mutationFn: async () => {
      let poster_url = ''
      if (file) poster_url = (await api.integrations.Core.UploadFile({ file })).file_url
      return api.ops.publishEvent({ ...form, poster_url })
    },
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['organizerEvents'] })
      toast.success('Événement publié 🎉')
      navigate(`/evenement/${event.id}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const onFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Choisis une image'); return }
    if (f.size > 4 * 1024 * 1024) { toast.error('Image trop lourde (4 Mo maximum)'); return }
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const incomplete = !form.title || !form.category || !form.date || !form.location
    || !form.city || !form.country || form.ticket_price === '' || !form.tickets_available

  const price = Number(form.ticket_price) || 0
  const stock = Number(form.tickets_available) || 0
  const projected = Math.round(price * stock * (1 - PLATFORM_FEE_RATE))

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-extrabold text-foreground">Créer un événement</h1>
          <p className="text-sm text-muted-foreground">Publie ton affiche et vends tes billets</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {!user && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
            <CircleAlert className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-accent font-medium mb-2">Connexion requise</p>
              <p className="text-xs text-accent/80 mb-3">Connecte-toi pour créer un profil organisateur et publier des événements.</p>
              <Button onClick={() => navigate('/connexion?from=/vendre')} className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-9 rounded-lg font-semibold w-full">
                Se connecter
              </Button>
            </div>
          </div>
        )}

        {user && !organizer && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
            <CircleAlert className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-accent font-medium mb-2">Profil organisateur requis</p>
              <p className="text-xs text-accent/80 mb-3">Tu dois créer un profil organisateur avant de créer des événements.</p>
              <Button onClick={() => navigate('/profil-organisateur')} className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-9 rounded-lg font-semibold w-full">
                Créer mon profil organisateur
              </Button>
            </div>
          </div>
        )}

        {organizer && organizer.status !== 'approuve' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
            <CircleAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium mb-2">Profil en attente d'approbation</p>
              <p className="text-xs text-destructive/80">
                {organizer.status === 'en_attente' && "Ton profil est en attente d'approbation par un administrateur. Tu pourras publier une fois approuvé."}
                {organizer.status === 'rejete' && 'Ton profil a été rejeté. Contacte le support pour plus d\'informations.'}
                {organizer.status === 'suspendu' && 'Ton compte a été suspendu. Contacte le support.'}
              </p>
            </div>
          </div>
        )}

        <div>
          <Label className="text-foreground text-sm mb-2 block">Affiche de l'événement</Label>
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            {preview ? (
              <div className="relative h-48 rounded-2xl overflow-hidden border border-border/50">
                <img src={preview} alt="Aperçu de l'affiche" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground"
                  aria-label="Retirer l'affiche"
                ><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="h-48 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-card hover:border-primary/40 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Ajouter une affiche</p>
                <p className="text-xs text-muted-foreground/70">JPG ou PNG, 4 Mo maximum</p>
              </div>
            )}
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-foreground text-sm">Nom de l'événement *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={90} placeholder="Ex: Nuit Culturelle de Bamako" className="mt-1.5 bg-secondary border-border text-foreground" />
          </div>

          <div>
            <Label className="text-foreground text-sm">Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border text-foreground"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-foreground text-sm">Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={600} placeholder="Programme, line-up, dress code, ce qui est compris dans le billet..." className="mt-1.5 bg-secondary border-border text-foreground h-24" />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.description.length}/600</p>
          </div>

          <div>
            <Label className="text-foreground text-sm">Date et heure *</Label>
            <Input type="datetime-local" min={minDateTime()} value={form.date} onChange={(e) => set('date', e.target.value)} className="mt-1.5 bg-secondary border-border text-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground text-sm">Pays *</Label>
              <Select value={form.country} onValueChange={(v) => { set('country', v); set('city', '') }}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border text-foreground"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground text-sm">Ville *</Label>
              <Input
                list="kelbail-cities" value={form.city} onChange={(e) => set('city', e.target.value)}
                placeholder={form.country ? cities[0] : "Choisis d'abord un pays"}
                disabled={!form.country} className="mt-1.5 bg-secondary border-border text-foreground"
              />
              <datalist id="kelbail-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <div>
            <Label className="text-foreground text-sm">Lieu *</Label>
            <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex: Palais de la Culture" className="mt-1.5 bg-secondary border-border text-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground text-sm">Prix du billet (F CFA) *</Label>
              <Input type="number" min="0" step="500" value={form.ticket_price} onChange={(e) => set('ticket_price', e.target.value)} placeholder="5000" className="mt-1.5 bg-secondary border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground text-sm">Nb. de billets *</Label>
              <Input type="number" min="1" step="10" value={form.tickets_available} onChange={(e) => set('tickets_available', e.target.value)} placeholder="200" className="mt-1.5 bg-secondary border-border text-foreground" />
            </div>
          </div>

          {price > 0 && stock > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary">
                À guichet fermé, tu encaisses <span className="font-bold">{projected.toLocaleString('fr-FR')} F CFA</span>,
                après les {PLATFORM_FEE_RATE * 100} % de commission Kel Bail.
              </p>
            </div>
          )}

          <div>
            <Label className="text-foreground text-sm">Nom de l'organisateur</Label>
            <Input value={form.organizer_name} onChange={(e) => set('organizer_name', e.target.value)} placeholder={organizer?.company_name || 'Ton nom ou celui de ta structure'} className="mt-1.5 bg-secondary border-border text-foreground" />
          </div>

          <div>
            <Label className="text-foreground text-sm mb-2 block">Position géographique</Label>
            <LocationPicker onLocationSelect={(lat, lng) => { set('latitude', lat); set('longitude', lng) }} initialLat={form.latitude} initialLng={form.longitude} />
          </div>
        </div>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl text-base font-bold mt-4"
          onClick={() => create.mutate()} disabled={create.isPending || !approved || incomplete}
        >
          {create.isPending ? <><LoaderCircle className="w-5 h-5 animate-spin mr-2" />Publication...</> : "Publier l'événement 🎉"}
        </Button>
        {approved && incomplete && (
          <p className="text-xs text-center text-muted-foreground -mt-2">Remplis les champs marqués d'une étoile pour publier.</p>
        )}
      </main>
    </div>
  )
}
