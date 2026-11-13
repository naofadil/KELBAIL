import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import SubPageHeader from '@/components/SubPageHeader'
import { PLATFORM_FEE_RATE } from '@/lib/utils'

const APP_VERSION = '1.0.0'

const LEGAL = [
  { title: "Conditions d'utilisation", body: `Kel Bail est une plateforme de billetterie mettant en relation des organisateurs d'événements et des participants en Afrique de l'Ouest. En créant un compte, tu acceptes de fournir des informations exactes. Les organisateurs sont seuls responsables de la tenue de leurs événements. Kel Bail prélève une commission de ${PLATFORM_FEE_RATE * 100} % sur chaque billet vendu. Un billet est nominatif, limité à 10 par personne et par événement, et ne peut être utilisé qu'une seule fois. Toute tentative de fraude entraîne la suspension du compte.` },
  { title: 'Politique de remboursement', body: "Les billets ne sont pas remboursables, sauf annulation de l'événement par l'organisateur. Dans ce cas, le montant payé est restitué sur le numéro Mobile Money utilisé lors de l'achat, sous 7 jours ouvrés, déduction faite des frais de l'opérateur." },
  { title: 'Confidentialité', body: "Nous collectons uniquement les données nécessaires au service : nom, email, téléphone, ville, historique d'achats. Ces données ne sont jamais revendues. Les organisateurs n'ont accès qu'au nom et au code des billets vendus pour leurs propres événements. Tu peux supprimer ton compte et tes données à tout moment depuis Compte → Paramètres." },
]

export default function Apropos() {
  const [open, setOpen] = useState(null)
  return (
    <div className="min-h-screen">
      <SubPageHeader title="À propos" subtitle="Informations sur Kel Bail" />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <div className="text-center py-4">
          <img src="/logo.png" alt="Kel Bail" className="w-20 h-20 mx-auto mb-3 drop-shadow-xl" />
          <h2 className="text-2xl font-black text-foreground">Kel Bail</h2>
          <p className="text-sm text-muted-foreground">Billets d'événements · version {APP_VERSION}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">« Kel bail ? » — <em>c'est quoi le plan ?</em> Kel Bail répond à la question en réunissant au même endroit kermesses, nuits culturelles, soirées, concerts et festivals de Lomé, Abidjan, Bamako et d'ailleurs.</p>
          <p className="text-sm text-muted-foreground leading-relaxed">Achète en quelques secondes par Mobile Money, reçois un billet avec QR code, et présente-le à l'entrée. Les organisateurs publient leurs événements, gèrent leur staff de scan et suivent leurs ventes en temps réel.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['🇹🇬', 'Togo'], ['🇨🇮', "Côte d'Ivoire"], ['🇲🇱', 'Mali']].map(([f, n]) => <div key={n} className="bg-card border border-border/50 rounded-xl p-3"><p className="text-2xl">{f}</p><p className="text-xs text-muted-foreground mt-1">{n}</p></div>)}
        </div>
        <section className="space-y-2">
          {LEGAL.map((l, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 p-4 text-left"><span className="text-sm font-medium text-foreground">{l.title}</span><ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`} /></button>
              {open === i && <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{l.body}</p>}
            </div>
          ))}
        </section>
        <p className="text-xs text-center text-muted-foreground pb-4">© {new Date().getFullYear()} Kel Bail · Fait avec ❤️ en Afrique de l'Ouest</p>
      </main>
    </div>
  )
}
