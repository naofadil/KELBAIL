/**
 * Référentiel géographique de la zone F CFA (UEMOA).
 * Chaque pays porte ses villes et ses opérateurs Mobile Money, ce qui permet
 * d'adapter le code USSD de paiement et les versements au pays de l'événement.
 */

export const COUNTRIES = [
  {
    code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228',
    cities: ['Lomé', 'Kara', 'Sokodé', 'Kpalimé', 'Atakpamé', 'Dapaong'],
    operators: [
      { name: 'T-Money', ussd: '*145*', color: 'text-blue-400' },
      { name: 'Flooz', ussd: '*144*3*', color: 'text-orange-400' },
    ],
  },
  {
    code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225',
    cities: ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Korhogo', 'Daloa'],
    operators: [
      { name: 'Orange Money', ussd: '*144*', color: 'text-orange-400' },
      { name: 'MTN MoMo', ussd: '*133*', color: 'text-yellow-400' },
      { name: 'Moov Money', ussd: '*155*', color: 'text-blue-400' },
      { name: 'Wave', ussd: '*177*', color: 'text-sky-400' },
    ],
  },
  {
    code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223',
    cities: ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes', 'Gao'],
    operators: [
      { name: 'Orange Money', ussd: '*144*', color: 'text-orange-400' },
      { name: 'Moov Money', ussd: '*155*', color: 'text-blue-400' },
    ],
  },
  {
    code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221',
    cities: ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Touba', 'Mbour'],
    operators: [
      { name: 'Wave', ussd: '*177*', color: 'text-sky-400' },
      { name: 'Orange Money', ussd: '*144*', color: 'text-orange-400' },
      { name: 'Free Money', ussd: '*402*', color: 'text-emerald-400' },
    ],
  },
  {
    code: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229',
    cities: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon'],
    operators: [
      { name: 'MTN MoMo', ussd: '*880*', color: 'text-yellow-400' },
      { name: 'Moov Money', ussd: '*855*', color: 'text-blue-400' },
      { name: 'Celtiis Cash', ussd: '*800*', color: 'text-violet-400' },
    ],
  },
  {
    code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226',
    cities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora'],
    operators: [
      { name: 'Orange Money', ussd: '*144*', color: 'text-orange-400' },
      { name: 'Moov Money', ussd: '*555*', color: 'text-blue-400' },
    ],
  },
  {
    code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227',
    cities: ['Niamey', 'Zinder', 'Maradi', 'Agadez'],
    operators: [
      { name: 'Airtel Money', ussd: '*436*', color: 'text-red-400' },
      { name: 'Moov Money', ussd: '*555*', color: 'text-blue-400' },
    ],
  },
  {
    code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dial: '+245',
    cities: ['Bissau', 'Bafatá', 'Gabú'],
    operators: [{ name: 'Orange Money', ussd: '*144*', color: 'text-orange-400' }],
  },
]

/** Index ville (normalisée) -> pays, pour deviner le pays d'un événement ancien. */
const CITY_INDEX = new Map()
COUNTRIES.forEach((c) => c.cities.forEach((city) => CITY_INDEX.set(normalize(city), c.name)))

export function normalize(s = '') {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export const getCountry = (name) => COUNTRIES.find((c) => c.name === name) || null

export const countryFlag = (name) => getCountry(name)?.flag || '🌍'

/** Pays d'un événement : champ explicite, sinon déduit de la ville. */
export function eventCountry(event) {
  if (event?.country) return event.country
  return CITY_INDEX.get(normalize(event?.city)) || ''
}

/** Toutes les villes connues, avec leur pays (pour l'autocomplétion du formulaire). */
export const ALL_CITIES = COUNTRIES.flatMap((c) => c.cities.map((city) => ({ city, country: c.name, flag: c.flag })))

/** Opérateurs Mobile Money disponibles pour un pays (repli : Togo). */
export function operatorsFor(countryName) {
  return getCountry(countryName)?.operators || COUNTRIES[0].operators
}

/** Indicatif téléphonique d'un pays. */
export const dialCode = (name) => getCountry(name)?.dial || '+228'

/**
 * Code USSD de paiement marchand, au format de l'opérateur choisi.
 * `*<prefixe><marchand>*<montant>#` — même structure que l'app d'origine.
 */
export function ussdCode(operator, merchant, amount) {
  const prefix = operator?.ussd || '*144*3*'
  return `${prefix}${merchant}*${amount}#`
}
