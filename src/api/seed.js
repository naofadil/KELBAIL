/**
 * Données initiales. Les six événements publiés sur kelbail.base44.app sont repris
 * à l'identique (titres, prix, descriptions, affiches, identifiants) et complétés
 * par leur pays ainsi que par six événements couvrant le reste de la zone F CFA.
 *
 * Les dates sont calculées au premier chargement par rapport au jour courant :
 * sur l'original elles étaient figées dans le passé, ce qui rendait les filtres
 * « Aujourd'hui / Demain / Ce week-end » toujours vides.
 */

const DEMO_PASSWORD = 'kelbail123'

/**
 * Formate une date en chaîne locale « AAAA-MM-JJTHH:MM:SS ».
 * `toISOString()` convertirait en UTC alors que ces chaînes sont relues comme
 * des heures locales, ce qui décalerait chaque événement du fuseau horaire.
 */
function local(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

/** Date à J+`days`, à l'heure `hour`:`min`. */
function at(days, hour, min = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, min, 0, 0)
  return local(d)
}

/**
 * Créneau « ce soir » : toujours à venir, et dans la journée en cours si
 * l'heure le permet. Sans cela, un horaire figé comme 22 h serait déjà passé
 * pour quiconque ouvre l'application en soirée, et le filtre « Aujourd'hui »
 * resterait vide.
 */
function tonight() {
  const now = new Date()
  const d = new Date(now.getTime() + 45 * 60 * 1000)
  if (d.getDate() !== now.getDate()) {
    // Trop tard pour caser l'événement aujourd'hui : il passe à demain soir.
    const t = new Date()
    t.setDate(t.getDate() + 1)
    t.setHours(21, 0, 0, 0)
    return local(t)
  }
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
  return local(d)
}

/** Prochain samedi (aujourd'hui si on est samedi), à l'heure donnée. */
function nextSaturday(hour) {
  const d = new Date()
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
  d.setHours(hour, 0, 0, 0)
  return local(d)
}

const CREATED = at(-30, 9)

/**
 * Identifiants des comptes de démonstration, précalculés hors ligne en
 * PBKDF2-HMAC-SHA256 avec un sel unique par compte. Les précalculer évite de
 * dériver onze mots de passe au premier chargement, ce qui serait lent dans le
 * repli JavaScript utilisé hors contexte sécurisé.
 */
const DEMO_CREDENTIALS = {
  'admin@kelbail.com': { salt: 'f010a49b44f1be5219d58e8bb6a3aec5', iterations: 6000, password_hash: 'e41f381abc5576ded03a33b278616249d2c9ce2ff8e614f9449e5aa1bbf63d9d' },
  'naofadil5@gmail.com': { salt: 'ca12f2a3ebcbf9646cc87e2dfc68be54', iterations: 6000, password_hash: 'f89aab86d997eff9355605d2e3ea4b77dad7ed7e12b43a8a17be83d8dd18329f' },
  'togoevents@kelbail.com': { salt: '188273cd86d80e81c813ef538f3c8289', iterations: 6000, password_hash: '1ed7820a75ed0c1b44dd0a0fd7cb8e745f2d9c326e79bb5f032b4bb0bdd32731' },
  'livenation@kelbail.com': { salt: '3349cf3aefed5223377be23f14c82e0a', iterations: 6000, password_hash: '9fae2ef26b028c19b722e7d618b04c66bce5b75b2f2fa4896521fe8fefc9bb55' },
  'culturemali@kelbail.com': { salt: '0ada7d4936d1f17930fec7cffec4e3b5', iterations: 6000, password_hash: 'ab7ef26ef5c904bc54201271032c7baae2c1bb03f2e5c535d9a49009ac9352be' },
  'nightevents@kelbail.com': { salt: '4b2bdd480c35f58def43cb99265ee822', iterations: 6000, password_hash: '5731d160a217e7aefc7c61be503066e7ca182fc4531f7aaf7123e07fee950522' },
  'poolparty@kelbail.com': { salt: 'a302c8a1a094791229ffc764871646bd', iterations: 6000, password_hash: 'd3ae3369277ed9b823a156119a1249511e9b1826692b1eea0f3813d5d0bbb059' },
  'saintjean@kelbail.com': { salt: '8263cb2982db3f1eac8440b6a3bbc697', iterations: 6000, password_hash: '9e4e2a524ff187b4caff4cc9f71dbb080e43721bb0485593bd820e3543c5b314' },
  'sahelprod@kelbail.com': { salt: 'f06b1d2ba8c15de9ffc010bf7f8a208f', iterations: 6000, password_hash: '3dfe23a38003c340e041acee4ef7531925976bba0d5e8fa45faf82ecf43e0de7' },
  'client@kelbail.com': { salt: '70a22155991f5cb892828abe83e6c3cc', iterations: 6000, password_hash: 'a7ac7c2f17cadbe97674583e082c936b05359b604568a3c4de0175c78fdaca37' },
  'staff@kelbail.com': { salt: 'df545278bffd1900a6a0e156829ef2a6', iterations: 6000, password_hash: 'c966e03542f7af5d9da02f995428494609b5b112ddc29ed86ac9079441545d0f' },
}

export const SEED_USERS = [
  { id: 'u_admin', email: 'admin@kelbail.com', full_name: 'Admin Kel Bail', role: 'admin', phone: '+228 90 00 00 00', city: 'Lomé', country: 'Togo' },
  { id: 'u_nao', email: 'naofadil5@gmail.com', full_name: 'Nao Fadil', role: 'admin', phone: '', city: 'Lomé', country: 'Togo' },
  { id: 'u_togo', email: 'togoevents@kelbail.com', full_name: 'Togo Events', role: 'user', phone: '+228 91 11 11 11', city: 'Lomé', country: 'Togo' },
  { id: 'u_live', email: 'livenation@kelbail.com', full_name: 'Live Nation Africa', role: 'user', phone: '+225 07 22 22 22', city: 'Abidjan', country: "Côte d'Ivoire" },
  { id: 'u_mali', email: 'culturemali@kelbail.com', full_name: 'Association Culture Mali', role: 'user', phone: '+223 70 33 33 33', city: 'Bamako', country: 'Mali' },
  { id: 'u_night', email: 'nightevents@kelbail.com', full_name: 'Night Events CI', role: 'user', phone: '+225 05 44 44 44', city: 'Abidjan', country: "Côte d'Ivoire" },
  { id: 'u_pool', email: 'poolparty@kelbail.com', full_name: 'Pool Party TG', role: 'user', phone: '+228 92 55 55 55', city: 'Lomé', country: 'Togo' },
  { id: 'u_paroisse', email: 'saintjean@kelbail.com', full_name: 'Paroisse Saint-Jean', role: 'user', phone: '+228 93 66 66 66', city: 'Lomé', country: 'Togo' },
  { id: 'u_sahel', email: 'sahelprod@kelbail.com', full_name: 'Sahel Prod', role: 'user', phone: '+221 77 99 99 99', city: 'Dakar', country: 'Sénégal' },
  { id: 'u_client', email: 'client@kelbail.com', full_name: 'Amadou Diallo', role: 'user', phone: '+228 96 77 77 77', city: 'Lomé', country: 'Togo' },
  { id: 'u_staff', email: 'staff@kelbail.com', full_name: 'Ali Diallo', role: 'user', phone: '+228 97 88 88 88', city: 'Lomé', country: 'Togo' },
].map((u) => ({ ...u, ...DEMO_CREDENTIALS[u.email], created_date: CREATED, updated_date: CREATED, bio: '', avatar_url: '' }))

export const SEED_ORGANIZERS = [
  { id: 'org_togo', user_email: 'togoevents@kelbail.com', company_name: 'Togo Events', description: 'Organisateur de festivals et événements grand public à Lomé depuis 2019.', phone: '+228 91 11 11 11', website: 'https://togoevents.tg', city: 'Lomé', country: 'Togo', status: 'approuve', is_verified: true, total_events: 2, rating: 4.7 },
  { id: 'org_live', user_email: 'livenation@kelbail.com', company_name: 'Live Nation Africa', description: 'Concerts et tournées des plus grands artistes africains.', phone: '+225 07 22 22 22', website: 'https://livenation.africa', city: 'Abidjan', country: "Côte d'Ivoire", status: 'approuve', is_verified: true, total_events: 1, rating: 4.9 },
  { id: 'org_mali', user_email: 'culturemali@kelbail.com', company_name: 'Association Culture Mali', description: 'Promotion de la culture malienne à travers des nuits culturelles.', phone: '+223 70 33 33 33', website: '', city: 'Bamako', country: 'Mali', status: 'approuve', is_verified: false, total_events: 1, rating: 4.5 },
  { id: 'org_night', user_email: 'nightevents@kelbail.com', company_name: 'Night Events CI', description: 'Soirées Afrobeat & Amapiano à Abidjan.', phone: '+225 05 44 44 44', website: '', city: 'Abidjan', country: "Côte d'Ivoire", status: 'approuve', is_verified: true, total_events: 2, rating: 4.6 },
  { id: 'org_pool', user_email: 'poolparty@kelbail.com', company_name: 'Pool Party TG', description: 'Les pool parties les plus folles de Lomé.', phone: '+228 92 55 55 55', website: '', city: 'Lomé', country: 'Togo', status: 'en_attente', is_verified: false, total_events: 1, rating: 0 },
  { id: 'org_paroisse', user_email: 'saintjean@kelbail.com', company_name: 'Paroisse Saint-Jean', description: 'Kermesses et événements paroissiaux.', phone: '+228 93 66 66 66', website: '', city: 'Lomé', country: 'Togo', status: 'approuve', is_verified: false, total_events: 1, rating: 4.2 },
  { id: 'org_sahel', user_email: 'sahelprod@kelbail.com', company_name: 'Sahel Prod', description: 'Production de concerts et festivals au Sénégal, au Burkina et au Niger.', phone: '+221 77 99 99 99', website: '', city: 'Dakar', country: 'Sénégal', status: 'approuve', is_verified: true, total_events: 3, rating: 4.8 },
].map((o) => ({ ...o, social_media: { instagram: '', facebook: '', twitter: '' }, logo_url: '', created_date: CREATED, updated_date: CREATED, created_by: o.user_email }))

export const SEED_EVENTS = [
  // --- Les six événements de l'application d'origine ---
  {
    id: '69bf9baae2929909dfa9c2fb', title: 'DJ Night - Afrobeat & Amapiano', category: 'soiree_boite',
    city: 'Abidjan', country: "Côte d'Ivoire", location: 'Club Le Diplomate', date: tonight(),
    description: "La plus grande soirée Afrobeat et Amapiano de la ville. DJs internationaux, open bar VIP, et ambiance garantie jusqu'au petit matin.",
    poster_url: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800',
    organizer_email: 'nightevents@kelbail.com', organizer_name: 'Night Events CI',
    ticket_price: 10000, tickets_available: 300, tickets_sold: 245, is_featured: true,
  },
  {
    id: '69bf9baae2929909dfa9c2fa', title: 'Nuit Culturelle de Bamako - Édition 2026', category: 'nuit_culturelle',
    city: 'Bamako', country: 'Mali', location: 'Palais de la Culture', date: at(1, 20),
    description: "Une soirée exceptionnelle célébrant la richesse culturelle malienne avec des performances de danse, musique traditionnelle et moderne, exposition d'art et dégustation culinaire.",
    poster_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    organizer_email: 'culturemali@kelbail.com', organizer_name: 'Association Culture Mali',
    ticket_price: 5000, tickets_available: 500, tickets_sold: 120, is_featured: true,
  },
  {
    id: '69bf9baae2929909dfa9c2fd', title: 'Festival des Grillades - BBQ Party', category: 'festival',
    city: 'Lomé', country: 'Togo', location: 'Plage de Baguida', date: nextSaturday(16),
    description: "Le plus grand festival de grillades de l'Afrique de l'Ouest. Compétition de grilleurs, musique live, et dégustation illimitée.",
    poster_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    organizer_email: 'togoevents@kelbail.com', organizer_name: 'Togo Events',
    ticket_price: 3000, tickets_available: 800, tickets_sold: 200, is_featured: true,
  },
  {
    id: '69bf9baae2929909dfa9c2fc', title: 'Kermesse Paroissiale Saint-Jean', category: 'kermesse',
    city: 'Lomé', country: 'Togo', location: 'Paroisse Saint-Jean', date: at(9, 10),
    description: 'Grande kermesse annuelle avec jeux pour enfants, tombola, stands de nourriture, spectacles de danse et animations pour toute la famille.',
    poster_url: 'https://images.unsplash.com/photo-1560983073-c29bff7438ef?w=800',
    organizer_email: 'saintjean@kelbail.com', organizer_name: 'Paroisse Saint-Jean',
    ticket_price: 1000, tickets_available: 1000, tickets_sold: 50, is_featured: false,
  },
  {
    id: '69bf9baae2929909dfa9c2ff', title: 'Soirée Mousse - Pool Party', category: 'soiree_boite',
    city: 'Lomé', country: 'Togo', location: 'Hôtel Sarakawa', date: at(16, 15),
    description: 'La soirée mousse la plus folle de la saison ! Piscine, mousse, DJ, cocktails et surprises. Dress code : maillot de bain.',
    poster_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    organizer_email: 'poolparty@kelbail.com', organizer_name: 'Pool Party TG',
    ticket_price: 7500, tickets_available: 200, tickets_sold: 180, is_featured: false,
  },
  {
    id: '69bf9baae2929909dfa9c2fe', title: 'Concert Live - Magic System', category: 'concert',
    city: 'Abidjan', country: "Côte d'Ivoire", location: 'Stade Félix Houphouët', date: at(21, 19),
    description: 'Magic System en concert exclusif ! Venez vibrer sur les plus grands hits du coupé-décalé dans une ambiance électrique.',
    poster_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    organizer_email: 'livenation@kelbail.com', organizer_name: 'Live Nation Africa',
    ticket_price: 15000, tickets_available: 5000, tickets_sold: 1800, is_featured: true,
  },

  // --- Événements ajoutés pour couvrir le reste de la zone F CFA ---
  {
    id: 'evt_dakar_sahel', title: 'Grand Bal du Sahel', category: 'concert',
    city: 'Dakar', country: 'Sénégal', location: 'Grand Théâtre National', date: at(5, 20, 30),
    description: 'Une nuit entière de mbalax, afrobeats et jazz sahélien, avec un orchestre de vingt musiciens et des invités surprises.',
    poster_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
    organizer_email: 'sahelprod@kelbail.com', organizer_name: 'Sahel Prod',
    ticket_price: 12000, tickets_available: 1200, tickets_sold: 640, is_featured: true,
  },
  {
    id: 'evt_cotonou_rumba', title: 'Nuit de la Rumba - Cotonou', category: 'nuit_culturelle',
    city: 'Cotonou', country: 'Bénin', location: 'Institut Français', date: at(12, 21),
    description: 'Hommage à la rumba congolaise et aux orchestres béninois, avec exposition photo et dégustation.',
    poster_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    organizer_email: 'sahelprod@kelbail.com', organizer_name: 'Sahel Prod',
    ticket_price: 6000, tickets_available: 400, tickets_sold: 95, is_featured: false,
  },
  {
    id: 'evt_ouaga_cine', title: 'Ciné-Concert Ouaga Nights', category: 'festival',
    city: 'Ouagadougou', country: 'Burkina Faso', location: 'Ciné Burkina', date: at(18, 19, 30),
    description: 'Projection de classiques du cinéma burkinabè accompagnée en direct par un ensemble de percussions et de kora.',
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    organizer_email: 'sahelprod@kelbail.com', organizer_name: 'Sahel Prod',
    ticket_price: 2500, tickets_available: 350, tickets_sold: 70, is_featured: false,
  },
  {
    id: 'evt_niamey_vibes', title: 'Festival Sahel Vibes', category: 'festival',
    city: 'Niamey', country: 'Niger', location: 'Palais du 29 Juillet', date: at(27, 18),
    description: 'Trois scènes, vingt artistes, un village artisanal et un marché gastronomique au bord du fleuve Niger.',
    poster_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
    organizer_email: 'sahelprod@kelbail.com', organizer_name: 'Sahel Prod',
    ticket_price: 4000, tickets_available: 2000, tickets_sold: 310, is_featured: false,
  },
  {
    id: 'evt_abidjan_brunch', title: 'Brunch Afro-Jazz du Dimanche', category: 'autre',
    city: 'Abidjan', country: "Côte d'Ivoire", location: 'Rooftop Plateau', date: at(3, 11),
    description: 'Brunch en terrasse avec trio jazz, DJ set afro-soul et vue sur la lagune. Places limitées.',
    poster_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    organizer_email: 'nightevents@kelbail.com', organizer_name: 'Night Events CI',
    ticket_price: 8000, tickets_available: 80, tickets_sold: 74, is_featured: false,
  },
  {
    id: 'evt_lome_marathon', title: 'Marathon de Lomé - Dossards', category: 'autre',
    city: 'Lomé', country: 'Togo', location: 'Boulevard du Mono', date: at(35, 6, 30),
    description: 'Dossards pour le marathon, le semi et la course de 10 km. Le tarif comprend le maillot, le ravitaillement et la médaille.',
    poster_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800',
    organizer_email: 'togoevents@kelbail.com', organizer_name: 'Togo Events',
    ticket_price: 5000, tickets_available: 600, tickets_sold: 600, is_featured: false,
  },
].map((e) => ({
  ...e, status: 'actif', is_sample: false, latitude: null, longitude: null,
  created_by: 'naofadil5@gmail.com', created_by_id: '69bf9a8c50d26636ffd3e2f5',
  created_date: CREATED, updated_date: CREATED,
}))

export const SEED_STAFF = [
  { id: 'staff_1', organizer_email: 'togoevents@kelbail.com', staff_email: 'staff@kelbail.com', staff_name: 'Ali Diallo', role: 'scanner', status: 'actif', events: [], created_date: CREATED, updated_date: CREATED },
]

export const SEED_TICKETS = [
  { id: 'tkt_demo_1', event_id: '69bf9baae2929909dfa9c2fd', buyer_email: 'client@kelbail.com', buyer_name: 'Amadou Diallo', quantity: 2, total_price: 6000, ticket_code: 'TKT-DEMO2026', payment_code: '*145*5773017*6000#', operator: 'T-Money', status: 'confirme', created_date: at(-3, 10), updated_date: at(-3, 10) },
]

export const SEED_FAQ = [
  { q: 'Comment acheter un billet ?', a: "Ouvre la fiche d'un événement, appuie sur « Acheter », indique ton nom et le nombre de billets, choisis ton opérateur Mobile Money puis compose le code USSD affiché. Une fois le paiement validé, ton billet et son QR code apparaissent dans l'onglet Billets." },
  { q: 'Quels moyens de paiement sont acceptés ?', a: 'Le paiement se fait par Mobile Money. Les opérateurs proposés dépendent du pays de l’événement : T-Money et Flooz au Togo, Orange Money, MTN MoMo, Moov et Wave en Côte d’Ivoire, Wave et Orange Money au Sénégal, et ainsi de suite.' },
  { q: "Comment présenter mon billet à l'entrée ?", a: "Montre le QR code de ton billet depuis l'onglet Billets. Le staff de l'organisateur le scanne ou saisit le code TKT-XXXX. Un billet ne peut être utilisé qu'une seule fois : une seconde tentative déclenche automatiquement un signalement de fraude." },
  { q: 'Que se passe-t-il si un événement est complet ?', a: "Tu peux rejoindre la liste d'attente depuis la fiche de l'événement. Si des places se libèrent, par exemple après une annulation, tu reçois une notification avant la remise en vente publique." },
  { q: 'Puis-je me faire rembourser ?', a: "Les billets ne sont pas remboursables, sauf en cas d'annulation de l'événement par l'organisateur. Dans ce cas, le remboursement est effectué sur le numéro Mobile Money ayant servi au paiement sous 7 jours." },
  { q: 'Comment devenir organisateur ?', a: "Va dans Compte → Profil Organisateur, renseigne ta structure et envoie ta demande. Un administrateur la valide sous 48 h. Tu pourras ensuite publier des événements, suivre tes ventes et gérer ton staff de scan." },
  { q: "Quand suis-je payé en tant qu'organisateur ?", a: "Tes gains, c'est-à-dire le prix des billets moins 5 % de commission, apparaissent dans Compte → Versements. Tu peux demander un versement Mobile Money à tout moment à partir de 5 000 F CFA." },
]

export { DEMO_PASSWORD }
