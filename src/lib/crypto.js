/**
 * Dérivation de mot de passe PBKDF2-HMAC-SHA256.
 *
 * L'API WebCrypto (`crypto.subtle`) n'est disponible que dans un contexte
 * sécurisé : HTTPS, localhost ou 127.0.0.1. Or l'application est aussi servie
 * sur une adresse LAN en clair (http://192.168.x.x:5173) pour être ouverte
 * depuis un téléphone via Expo Go. Ce module utilise donc WebCrypto quand il
 * existe et bascule sinon sur une implémentation JavaScript du même algorithme,
 * qui produit exactement les mêmes empreintes.
 */

const KEY_LEN = 32

/* ------------------------------------------------------------------ */
/* SHA-256 (FIPS 180-4)                                                */
/* ------------------------------------------------------------------ */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const rotr = (x, n) => (x >>> n) | (x << (32 - n))

/** Empreinte SHA-256 d'un Uint8Array, renvoyée sur 32 octets. */
export function sha256(bytes) {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])
  const bitLen = bytes.length * 8
  // Remplissage : octet 0x80, zéros, puis longueur sur 64 bits big-endian.
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))
  view.setUint32(padded.length - 4, bitLen >>> 0)

  const w = new Uint32Array(64)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0
  }
  const out = new Uint8Array(32)
  new DataView(out.buffer).setUint32(0, h[0])
  for (let i = 0; i < 8; i++) new DataView(out.buffer).setUint32(i * 4, h[i])
  return out
}

/* ------------------------------------------------------------------ */
/* HMAC-SHA256 et PBKDF2                                               */
/* ------------------------------------------------------------------ */

function hmacSha256(key, msg) {
  const block = new Uint8Array(64)
  block.set(key.length > 64 ? sha256(key) : key)
  const inner = new Uint8Array(64 + msg.length)
  const outer = new Uint8Array(96)
  for (let i = 0; i < 64; i++) {
    inner[i] = block[i] ^ 0x36
    outer[i] = block[i] ^ 0x5c
  }
  inner.set(msg, 64)
  outer.set(sha256(inner), 64)
  return sha256(outer)
}

function pbkdf2Js(password, salt, iterations, keyLen) {
  const blocks = Math.ceil(keyLen / 32)
  const out = new Uint8Array(blocks * 32)
  const input = new Uint8Array(salt.length + 4)
  input.set(salt)
  for (let b = 1; b <= blocks; b++) {
    new DataView(input.buffer).setUint32(salt.length, b)
    let u = hmacSha256(password, input)
    const acc = u.slice()
    for (let i = 1; i < iterations; i++) {
      u = hmacSha256(password, u)
      for (let j = 0; j < 32; j++) acc[j] ^= u[j]
    }
    out.set(acc, (b - 1) * 32)
  }
  return out.slice(0, keyLen)
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder()
const toHex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
const fromHex = (h) => new Uint8Array(h.match(/.{2}/g).map((x) => parseInt(x, 16)))

/** `crypto.subtle` n'existe qu'en contexte sécurisé (HTTPS ou localhost). */
const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined

/** Sel aléatoire de 16 octets, en hexadécimal. */
export function randomSalt() {
  const b = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b)
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256)
  return toHex(b)
}

/** Identifiant aléatoire non devinable (codes de billets, jetons de session). */
export function randomToken(bytes = 8) {
  const b = new Uint8Array(bytes)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b)
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256)
  return toHex(b)
}

/**
 * Coût par défaut. WebCrypto dérive la clé en code natif ; le repli JavaScript
 * est environ cinquante fois plus lent, on y réduit donc le nombre d'itérations
 * pour qu'une connexion depuis un téléphone reste sous la seconde. Le nombre
 * retenu est enregistré avec l'empreinte, si bien que n'importe quel contexte
 * sait vérifier n'importe quel compte.
 */
export const DEFAULT_ITERATIONS = subtle ? 25_000 : 6_000

/** Empreinte PBKDF2-HMAC-SHA256 d'un mot de passe, en hexadécimal. */
export async function hashPassword(password, saltHex, iterations = DEFAULT_ITERATIONS) {
  const pw = enc.encode(password)
  const salt = fromHex(saltHex)
  if (subtle) {
    const key = await subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits'])
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, KEY_LEN * 8,
    )
    return toHex(new Uint8Array(bits))
  }
  return toHex(pbkdf2Js(pw, salt, iterations, KEY_LEN))
}

/** Nouvelles informations d'authentification pour un mot de passe donné. */
export async function makeCredentials(password) {
  const salt = randomSalt()
  const iterations = DEFAULT_ITERATIONS
  return { salt, iterations, password_hash: await hashPassword(password, salt, iterations) }
}

/**
 * Vérifie un mot de passe contre un compte stocké, en réutilisant les
 * paramètres enregistrés avec l'empreinte.
 */
export async function verifyPassword(password, account) {
  if (!account?.salt || !account?.password_hash) return false
  const candidate = await hashPassword(password, account.salt, account.iterations || DEFAULT_ITERATIONS)
  return safeEqual(candidate, account.password_hash)
}

/** Comparaison à temps constant, pour ne pas fuiter d'information par la durée. */
export function safeEqual(a = '', b = '') {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
