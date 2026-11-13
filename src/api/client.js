/**
 * Client de données local.
 *
 * Il expose la même surface que le SDK Base44 utilisé par l'application
 * d'origine (`auth`, `entities.X.list/filter/create/update/delete`,
 * `integrations.Core.UploadFile`, `functions.invoke`) mais stocke tout dans
 * `localStorage`, plus une couche `ops` qui regroupe les opérations sensibles
 * et leurs contrôles d'accès.
 *
 * Limite assumée : une application entièrement côté navigateur ne peut pas
 * faire respecter ses propres règles, puisque le porteur des données est aussi
 * celui qui les contrôle. Les vérifications ci-dessous valent donc comme
 * garde-fous applicatifs et comme spécification de ce qu'un vrai serveur
 * devrait appliquer, pas comme une barrière infranchissable.
 */
import QRCode from 'qrcode'
import { makeCredentials, verifyPassword, randomToken } from '@/lib/crypto'
import { PLATFORM_FEE_RATE } from '@/lib/utils'
import {
  SEED_EVENTS, SEED_ORGANIZERS, SEED_STAFF, SEED_TICKETS, SEED_USERS,
} from './seed'

const DB_KEY = 'kelbail_db_v2'
const SESSION_KEY = 'kelbail_session_v2'
const COLLECTIONS = [
  'User', 'Event', 'Ticket', 'Organizer', 'StaffMember', 'FraudReport', 'Notification',
  'Favorite', 'Message', 'Payout', 'AlertPreference', 'SupportRequest', 'Waitlist', 'Follow',
]

/** Champs d'un compte qui ne doivent jamais sortir de la couche de données. */
const SECRET_USER_FIELDS = ['password_hash', 'salt', 'iterations']

/** Plafond de billets par personne et par événement. */
export const MAX_TICKETS_PER_PERSON = 10

const now = () => new Date().toISOString()
const uid = () => randomToken(10)
const delay = (ms = 30) => new Promise((r) => setTimeout(r, ms))

export class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

/* ------------------------------------------------------------------ */
/* Stockage                                                            */
/* ------------------------------------------------------------------ */

let db = null

const emptyDb = () => Object.fromEntries(COLLECTIONS.map((c) => [c, []]))

function seedDb() {
  const fresh = emptyDb()
  fresh.User = SEED_USERS.map((u) => ({ ...u }))
  fresh.Event = SEED_EVENTS.map((e) => ({ ...e }))
  fresh.Organizer = SEED_ORGANIZERS.map((o) => ({ ...o }))
  fresh.StaffMember = SEED_STAFF.map((s) => ({ ...s }))
  fresh.Ticket = SEED_TICKETS.map((t) => ({ ...t }))
  return fresh
}

function load() {
  if (db) return db
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) { db = { ...emptyDb(), ...JSON.parse(raw) }; return db }
  } catch { /* données illisibles : on réamorce */ }
  db = seedDb()
  persist()
  return db
}

function persist() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* quota dépassé */ }
  window.dispatchEvent(new CustomEvent('kelbail:db'))
}

export function resetDatabase() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
  db = null
  load()
}

/* ------------------------------------------------------------------ */
/* Requêtes                                                            */
/* ------------------------------------------------------------------ */

function sortBy(items, sort) {
  if (!sort) return items
  const desc = sort.startsWith('-')
  const key = desc ? sort.slice(1) : sort
  return [...items].sort((a, b) => {
    const va = a[key] ?? ''
    const vb = b[key] ?? ''
    if (va < vb) return desc ? 1 : -1
    if (va > vb) return desc ? -1 : 1
    return 0
  })
}

function matches(item, query = {}) {
  return Object.entries(query).every(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(item[k])
      if ('$ne' in v) return item[k] !== v.$ne
      if ('$gte' in v && !(item[k] >= v.$gte)) return false
      if ('$lte' in v && !(item[k] <= v.$lte)) return false
      return true
    }
    return item[k] === v
  })
}

/** Retire les secrets des enregistrements de la collection `User`. */
function sanitize(name, item) {
  if (name !== 'User' || !item) return item
  const copy = { ...item }
  SECRET_USER_FIELDS.forEach((f) => delete copy[f])
  return copy
}

function entity(name) {
  const out = (i) => sanitize(name, i)
  return {
    async list(sort = '-created_date', limit = 100) {
      load(); await delay()
      return sortBy(db[name], sort).slice(0, limit).map(out)
    },
    async filter(query = {}, sort = '-created_date', limit = 1000) {
      load(); await delay()
      return sortBy(db[name].filter((i) => matches(i, query)), sort).slice(0, limit).map(out)
    },
    async get(id) {
      load()
      return out(db[name].find((i) => i.id === id) || null)
    },
    async create(data) {
      load()
      const item = {
        id: uid(), ...data,
        created_by: getSession()?.email || data.created_by || null,
        created_date: now(), updated_date: now(),
      }
      db[name].push(item)
      persist()
      return out(item)
    },
    async bulkCreate(items) {
      const res = []
      for (const i of items) res.push(await this.create(i))
      return res
    },
    async update(id, data) {
      load()
      const idx = db[name].findIndex((i) => i.id === id)
      if (idx === -1) throw new ApiError(`${name} introuvable`, 404)
      // Les secrets d'un compte ne se modifient que par le module d'authentification.
      const patch = { ...data }
      if (name === 'User') SECRET_USER_FIELDS.forEach((f) => delete patch[f])
      db[name][idx] = { ...db[name][idx], ...patch, updated_date: now() }
      persist()
      return out(db[name][idx])
    },
    async delete(id) {
      load()
      db[name] = db[name].filter((i) => i.id !== id)
      persist()
      return true
    },
  }
}

const entities = Object.fromEntries(COLLECTIONS.map((c) => [c, entity(c)]))

/** Accès brut réservé à l'intérieur de ce module (inclut les secrets). */
const raw = (name) => { load(); return db[name] }

/* ------------------------------------------------------------------ */
/* Authentification                                                    */
/* ------------------------------------------------------------------ */

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

function setSession(user) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email }))
  else localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new CustomEvent('kelbail:auth'))
}

/** Compte connecté, secrets compris. Usage interne uniquement. */
function currentAccount() {
  const s = getSession()
  if (!s) return null
  return raw('User').find((u) => u.id === s.id && !u.deleted) || null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const auth = {
  isAuthenticated: () => !!currentAccount(),

  async me() {
    const user = currentAccount()
    if (!user) throw new ApiError('Non connecté', 401)
    return sanitize('User', user)
  },

  async login({ email, password }) {
    load(); await delay(120)
    const clean = String(email || '').trim().toLowerCase()
    const account = raw('User').find((u) => u.email.toLowerCase() === clean && !u.deleted)
    // Message identique dans les deux cas : ne pas révéler quels emails existent.
    const ok = account && (await verifyPassword(password, account))
    if (!ok) throw new ApiError('Email ou mot de passe incorrect', 401)
    setSession(account)
    return sanitize('User', account)
  },

  async register({ email, password, full_name, phone = '', city = '', country = '' }) {
    load(); await delay(120)
    const clean = String(email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) throw new ApiError('Adresse email invalide')
    if (!String(full_name || '').trim()) throw new ApiError('Le nom est obligatoire')
    if (String(password || '').length < 8) throw new ApiError('Le mot de passe doit contenir au moins 8 caractères')
    if (raw('User').some((u) => u.email.toLowerCase() === clean)) {
      throw new ApiError('Un compte existe déjà avec cet email')
    }
    const account = {
      id: uid(), email: clean, full_name: full_name.trim(), phone, city, country,
      role: 'user', bio: '', avatar_url: '',
      ...(await makeCredentials(password)),
      created_date: now(), updated_date: now(),
    }
    raw('User').push(account)
    persist()
    setSession(account)
    return sanitize('User', account)
  },

  async updateMe(data) {
    const account = currentAccount()
    if (!account) throw new ApiError('Non connecté', 401)
    const patch = { ...data }
    SECRET_USER_FIELDS.forEach((f) => delete patch[f])
    delete patch.role // personne ne s'auto-promeut administrateur
    Object.assign(account, patch, { updated_date: now() })
    persist()
    window.dispatchEvent(new CustomEvent('kelbail:auth'))
    return sanitize('User', account)
  },

  async changePassword({ current, next }) {
    const account = currentAccount()
    if (!account) throw new ApiError('Non connecté', 401)
    if (!(await verifyPassword(current, account))) throw new ApiError('Mot de passe actuel incorrect')
    if (String(next || '').length < 8) throw new ApiError('Le nouveau mot de passe doit contenir au moins 8 caractères')
    Object.assign(account, await makeCredentials(next), { updated_date: now() })
    persist()
  },

  logout(redirectTo = '/') {
    setSession(null)
    window.location.href = redirectTo
  },

  redirectToLogin(from) {
    const target = from || window.location.pathname + window.location.search
    window.location.href = `/connexion?from=${encodeURIComponent(target)}`
  },
}

/* ------------------------------------------------------------------ */
/* Contrôles d'accès                                                   */
/* ------------------------------------------------------------------ */

function requireUser() {
  const u = currentAccount()
  if (!u) throw new ApiError('Connecte-toi pour effectuer cette action', 401)
  return u
}

function requireAdmin() {
  const u = requireUser()
  if (u.role !== 'admin') throw new ApiError('Action réservée aux administrateurs', 403)
  return u
}

/** Exige que l'appelant soit l'organisateur de l'événement, ou son staff actif. */
function requireEventAccess(eventId, { staffAllowed = true } = {}) {
  const user = requireUser()
  const event = raw('Event').find((e) => e.id === eventId)
  if (!event) throw new ApiError('Événement introuvable', 404)
  if (event.organizer_email === user.email || user.role === 'admin') return { user, event }
  if (staffAllowed) {
    const staff = raw('StaffMember').find(
      (s) => s.staff_email === user.email && s.status === 'actif'
        && s.organizer_email === event.organizer_email
        && (!s.events?.length || s.events.includes(eventId)),
    )
    if (staff) return { user, event, staff }
  }
  throw new ApiError("Tu n'es pas autorisé à gérer cet événement", 403)
}

/* ------------------------------------------------------------------ */
/* Opérations métier                                                   */
/* ------------------------------------------------------------------ */

const notify = (user_email, type, title, message, action_url) =>
  entities.Notification.create({ user_email, type, status: 'unread', title, message, action_url })

const ops = {
  /** Places encore disponibles pour un événement. */
  remaining(event) {
    return Math.max(0, (event?.tickets_available || 0) - (event?.tickets_sold || 0))
  },

  /**
   * Achat de billets. Vérifie le stock réel et le plafond par personne au
   * moment de l'écriture, et pas seulement dans l'interface.
   */
  async purchase({ eventId, quantity, buyerName, operator, ussdCode }) {
    const user = requireUser()
    load()
    const event = raw('Event').find((e) => e.id === eventId)
    if (!event) throw new ApiError('Événement introuvable', 404)
    if (event.status === 'annule') throw new ApiError('Cet événement a été annulé')
    if (new Date(event.date) < new Date()) throw new ApiError('Cet événement est déjà passé')

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) throw new ApiError('Quantité invalide')
    if (!String(buyerName || '').trim()) throw new ApiError('Indique le nom du participant')

    const left = ops.remaining(event)
    if (qty > left) {
      throw new ApiError(left === 0 ? 'Cet événement est complet' : `Il ne reste que ${left} place(s)`)
    }
    const already = raw('Ticket')
      .filter((t) => t.event_id === eventId && t.buyer_email === user.email && t.status !== 'annule')
      .reduce((s, t) => s + t.quantity, 0)
    if (already + qty > MAX_TICKETS_PER_PERSON) {
      throw new ApiError(`Limite de ${MAX_TICKETS_PER_PERSON} billets par personne par événement dépassée.`)
    }

    const ticket = await entities.Ticket.create({
      event_id: eventId, buyer_email: user.email, buyer_name: buyerName.trim(),
      quantity: qty, total_price: qty * event.ticket_price,
      ticket_code: `TKT-${randomToken(4).toUpperCase()}`,
      payment_code: ussdCode, operator, status: 'en_attente',
    })
    event.tickets_sold = (event.tickets_sold || 0) + qty
    event.updated_date = now()
    persist()

    // Le serveur enverrait ici le billet par email ; on génère le QR et on confirme.
    await functions.invoke('sendTicketEmail', { ticketId: ticket.id })
    if (event.organizer_email) {
      await notify(event.organizer_email, 'ticket_confirmation', 'Nouvelle vente',
        `${buyerName} a acheté ${qty} billet(s) pour « ${event.title} »`, '/gestion')
    }
    return ticket
  },

  /**
   * Validation d'un billet à l'entrée. Réservée à l'organisateur et à son staff.
   * Une seconde présentation du même billet déclenche un signalement de fraude.
   */
  async validateTicket({ code, eventId }) {
    const { user } = requireEventAccess(eventId)
    load()
    // Accepte l'ancien format "TKT-XXXX" et le nouveau "KB:TKT-XXXX:<id>"
    const raw_code = String(code || '').trim().toUpperCase()
    const parsed_code = raw_code.startsWith('KB:') ? raw_code.split(':')[1] : raw_code
    const ticket = raw('Ticket').find((t) => t.ticket_code === parsed_code)
    if (!ticket) throw new ApiError('Billet non trouvé', 404)
    if (ticket.event_id !== eventId) throw new ApiError("Ce billet n'appartient pas à cet événement")
    if (ticket.status === 'annule') return { status: 'invalid', ticket, message: 'Billet annulé' }

    if (ticket.status === 'utilise') {
      const known = raw('FraudReport').some((f) => f.ticket_id === ticket.id && f.type === 'duplicate_use')
      if (!known) {
        await entities.FraudReport.create({
          reporter_email: user.email, ticket_id: ticket.id, event_id: eventId, type: 'duplicate_use',
          description: `Tentative d'utilisation du billet ${ticket.ticket_code} une seconde fois. Acheteur : ${ticket.buyer_email}`,
          status: 'confirmed', admin_notes: 'Fraude détectée automatiquement au scan',
        })
      }
      return { status: 'used', ticket, message: known ? 'Fraude déjà signalée - billet utilisé 2 fois' : 'Billet déjà utilisé - incident signalé' }
    }
    if (ticket.status === 'en_attente') {
      return { status: 'pending', ticket, message: 'En attente de confirmation de paiement' }
    }
    await entities.Ticket.update(ticket.id, { status: 'utilise', used_at: now(), used_by: user.email })
    return { status: 'valid', ticket, message: `${ticket.buyer_name} - Entrée autorisée ✓` }
  },

  /** Annulation d'un événement : billets annulés et acheteurs prévenus. */
  async cancelEvent(eventId) {
    const { event } = requireEventAccess(eventId, { staffAllowed: false })
    await entities.Event.update(eventId, { status: 'annule' })
    const tickets = raw('Ticket').filter((t) => t.event_id === eventId && t.status !== 'annule')
    for (const t of tickets) await entities.Ticket.update(t.id, { status: 'annule' })
    const buyers = [...new Set(tickets.map((t) => t.buyer_email))]
    for (const email of buyers) {
      await notify(email, 'event_status_change', 'Événement annulé',
        `« ${event.title} » a été annulé. Tes billets seront remboursés sous 7 jours.`, '/billets')
    }
    return buyers.length
  },

  /**
   * Modification de la jauge. Si des places s'ouvrent, la liste d'attente est
   * prévenue avant la remise en vente publique.
   */
  async setCapacity(eventId, total) {
    const { event } = requireEventAccess(eventId, { staffAllowed: false })
    const next = Number(total)
    if (!Number.isInteger(next) || next < (event.tickets_sold || 0)) {
      throw new ApiError('La jauge ne peut pas être inférieure au nombre de billets déjà vendus')
    }
    const opened = next - (event.tickets_available || 0)
    await entities.Event.update(eventId, { tickets_available: next })
    if (opened > 0) {
      const waiting = raw('Waitlist').filter((w) => w.event_id === eventId && !w.notified)
      for (const w of waiting) {
        await entities.Waitlist.update(w.id, { notified: true })
        await notify(w.user_email, 'new_event', 'Des places se libèrent 🎟️',
          `${opened} place(s) viennent d'être ouvertes pour « ${event.title} ».`, `/evenement/${eventId}`)
      }
      return waiting.length
    }
    return 0
  },

  /** Inscription à la liste d'attente d'un événement complet. */
  async joinWaitlist(eventId) {
    const user = requireUser()
    load()
    const existing = raw('Waitlist').find((w) => w.event_id === eventId && w.user_email === user.email)
    if (existing) return existing
    return entities.Waitlist.create({ event_id: eventId, user_email: user.email, notified: false })
  },

  async leaveWaitlist(eventId) {
    const user = requireUser()
    load()
    const existing = raw('Waitlist').find((w) => w.event_id === eventId && w.user_email === user.email)
    if (existing) await entities.Waitlist.delete(existing.id)
  },

  /** Suivi d'un organisateur : prévient l'utilisateur de ses prochains événements. */
  async toggleFollow(organizerEmail) {
    const user = requireUser()
    if (organizerEmail === user.email) throw new ApiError('Tu ne peux pas te suivre toi-même')
    load()
    const existing = raw('Follow').find(
      (f) => f.organizer_email === organizerEmail && f.user_email === user.email,
    )
    if (existing) { await entities.Follow.delete(existing.id); return false }
    await entities.Follow.create({ organizer_email: organizerEmail, user_email: user.email })
    return true
  },

  /** Publication d'un événement : les abonnés de l'organisateur sont prévenus. */
  async publishEvent(data) {
    const user = requireUser()
    load()
    const organizer = raw('Organizer').find((o) => o.user_email === user.email)
    if (!organizer) throw new ApiError("Crée d'abord ton profil organisateur", 403)
    if (organizer.status !== 'approuve') throw new ApiError("Ton profil organisateur n'est pas encore approuvé", 403)

    const price = Number(data.ticket_price)
    const stock = Number(data.tickets_available)
    if (!String(data.title || '').trim()) throw new ApiError("Le nom de l'événement est obligatoire")
    if (!data.category) throw new ApiError('Choisis une catégorie')
    if (!data.date || Number.isNaN(Date.parse(data.date))) throw new ApiError('Date invalide')
    if (new Date(data.date) < new Date()) throw new ApiError('La date doit être dans le futur')
    if (!String(data.city || '').trim() || !String(data.country || '').trim()) throw new ApiError('Indique la ville et le pays')
    if (!Number.isFinite(price) || price < 0) throw new ApiError('Prix invalide')
    if (!Number.isInteger(stock) || stock < 1) throw new ApiError('Indique un nombre de billets valide')

    const event = await entities.Event.create({
      ...data, ticket_price: price, tickets_available: stock, tickets_sold: 0,
      organizer_email: user.email,
      organizer_name: data.organizer_name || organizer.company_name || user.full_name,
      status: 'actif', is_featured: false,
    })
    await entities.Organizer.update(organizer.id, { total_events: (organizer.total_events || 0) + 1 })

    const followers = raw('Follow').filter((f) => f.organizer_email === user.email)
    for (const f of followers) {
      await notify(f.user_email, 'new_event', `${organizer.company_name} publie un événement`,
        `« ${event.title} » à ${event.city}, le ${new Date(event.date).toLocaleDateString('fr-FR')}.`,
        `/evenement/${event.id}`)
    }
    return event
  },

  /** Changement de statut d'un organisateur. Réservé aux administrateurs. */
  async setOrganizerStatus(organizerId, patch, message) {
    requireAdmin()
    const organizer = await entities.Organizer.update(organizerId, patch)
    if (message) {
      await notify(organizer.user_email, 'organizer', message.title, message.body, '/profil-organisateur')
    }
    return organizer
  },

  /** Traitement d'un signalement de fraude. Réservé aux administrateurs. */
  async reviewFraudReport(reportId, { status, adminNotes }) {
    requireAdmin()
    load()
    const report = raw('FraudReport').find((r) => r.id === reportId)
    if (!report) throw new ApiError('Signalement introuvable', 404)
    await entities.FraudReport.update(reportId, { status, admin_notes: adminNotes })
    if (status === 'confirmed' && report.type === 'fake_organizer') {
      const event = raw('Event').find((e) => e.id === report.event_id)
      const organizer = raw('Organizer').find(
        (o) => o.id === report.organizer_id || (event && o.user_email === event.organizer_email),
      )
      if (organizer) await entities.Organizer.update(organizer.id, { status: 'suspendu' })
    }
  },

  /** Demande de versement des gains d'un organisateur. */
  async requestPayout({ amount, operator, phone }) {
    const user = requireUser()
    load()
    const value = Number(amount)
    const available = ops.organizerBalance(user.email).available
    if (!Number.isFinite(value) || value < 5000) throw new ApiError('Montant minimum : 5 000 F CFA')
    if (value > available) throw new ApiError('Montant supérieur à ton solde disponible')
    if (!operator || !String(phone || '').trim()) throw new ApiError('Choisis un opérateur et un numéro')
    const payout = await entities.Payout.create({
      organizer_email: user.email, amount: value, operator, phone: phone.trim(), status: 'en_attente',
    })
    await notify(user.email, 'payout', 'Demande de versement reçue',
      `${value.toLocaleString('fr-FR')} F CFA seront envoyés sur ${phone} (${operator}) sous 48 h.`,
      '/compte/versements')
    return payout
  },

  /** Solde d'un organisateur : billets encaissés, moins commission et versements. */
  organizerBalance(email) {
    load()
    const eventIds = new Set(raw('Event').filter((e) => e.organizer_email === email).map((e) => e.id))
    const paid = raw('Ticket').filter(
      (t) => eventIds.has(t.event_id) && (t.status === 'confirme' || t.status === 'utilise'),
    )
    const gross = paid.reduce((s, t) => s + (t.total_price || 0), 0)
    const fees = Math.round(gross * PLATFORM_FEE_RATE)
    const withdrawn = raw('Payout')
      .filter((p) => p.organizer_email === email && p.status !== 'rejete')
      .reduce((s, p) => s + p.amount, 0)
    return { gross, fees, net: gross - fees, withdrawn, available: Math.max(0, gross - fees - withdrawn) }
  },

  /**
   * Transfert de billet à un autre titulaire (revente ou don).
   * Enregistre l'historique de propriété sans changer le ticket_code.
   */
  async transferTicket({ ticketId, newOwnerName, newOwnerEmail }) {
    const user = requireUser()
    load()
    const ticket = raw('Ticket').find((t) => t.id === ticketId)
    if (!ticket) throw new ApiError('Billet introuvable', 404)
    if (ticket.buyer_email !== user.email) throw new ApiError('Ce billet ne vous appartient pas')
    if (ticket.status === 'utilise') throw new ApiError('Ce billet a déjà été utilisé')
    if (ticket.status === 'annule') throw new ApiError('Ce billet est annulé')
    if (!String(newOwnerName || '').trim()) throw new ApiError('Nom du nouveau titulaire requis')

    const history = ticket.transfer_history || []
    history.push({ from_name: ticket.buyer_name, from_email: ticket.buyer_email, to_name: newOwnerName.trim(), transferred_at: now() })

    await entities.Ticket.update(ticketId, {
      buyer_name: newOwnerName.trim(),
      ...(newOwnerEmail ? { buyer_email: newOwnerEmail } : {}),
      transfer_history: history,
      // Regénérer le QR avec le même code (le code ne change pas, l'ID reste le même)
    })
    // Regénérer le QR pour invalider les captures de l'ancienne version
    await functions.invoke('sendTicketEmail', { ticketId })
    return { success: true }
  },
}

/* ------------------------------------------------------------------ */
/* Intégrations et fonctions serveur simulées                          */
/* ------------------------------------------------------------------ */

const MAX_UPLOAD = 4 * 1024 * 1024

const integrations = {
  Core: {
    UploadFile({ file }) {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new ApiError('Aucun fichier'))
        if (!file.type?.startsWith('image/')) return reject(new ApiError('Choisis une image'))
        if (file.size > MAX_UPLOAD) return reject(new ApiError('Image trop lourde (4 Mo maximum)'))
        const reader = new FileReader()
        reader.onload = () => resolve({ file_url: reader.result })
        reader.onerror = () => reject(new ApiError('Lecture du fichier impossible'))
        reader.readAsDataURL(file)
      })
    },
  },
}

const functions = {
  async invoke(name, payload = {}) {
    load()
    if (name !== 'sendTicketEmail') throw new ApiError(`Fonction inconnue : ${name}`, 404)
    const ticket = raw('Ticket').find((t) => t.id === payload.ticketId)
    if (!ticket) throw new ApiError('Billet introuvable', 404)
    // Format: KB:<code>:<id>  — lie le code visuel à l'ID base de données, rendant les captures d'écran clonable non vérifiables
    const qrPayload = `KB:${ticket.ticket_code}:${ticket.id}`
    const qr_code_url = await QRCode.toDataURL(qrPayload, {
      width: 400, margin: 1, color: { dark: '#000000', light: '#ffffff' },
    })
    const wasPending = ticket.status === 'en_attente'
    await entities.Ticket.update(ticket.id, {
      qr_code_url, ...(wasPending ? { status: 'confirme' } : {}),
    })
    if (wasPending) {
      const event = raw('Event').find((e) => e.id === ticket.event_id)
      await notify(ticket.buyer_email, 'ticket_confirmation', 'Billet confirmé',
        `Ton billet pour « ${event?.title || "l'événement"} » est confirmé. Code : ${ticket.ticket_code}`,
        '/billets')
    }
    return { data: { qr_code_url, email_sent: true } }
  },
}

export const api = { auth, entities, ops, integrations, functions }

export default api
