# Kel Bail — Billets d'événements

Reproduction de l'application **[kelbail.base44.app](https://kelbail.base44.app)**
(billetterie d'événements en Afrique de l'Ouest, prix en F CFA, thème sombre),
complétée par les pages qui étaient « en construction » sur l'original, par un
filtrage pays et ville, et par plusieurs mécanismes repris des billetteries
étrangères de référence.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production dans dist/
```

Stack : Vite 6 · React 18 · Tailwind CSS 3 · shadcn/ui (Radix) · React Router 6 ·
TanStack Query 5 · lucide-react · date-fns · sonner · qrcode.

## Voir l'application sur téléphone (Expo Go)

Le dossier [`mobile/`](mobile) contient une application Expo qui affiche Kel Bail
dans une WebView plein écran. Deux serveurs doivent tourner en même temps :

```bash
node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173
```

```bash
cd mobile && npx expo start --lan
```

Scanne ensuite le QR code avec Expo Go (Android) ou l'appareil photo (iPhone).
Si l'adresse IP du Mac change, mets à jour `APP_URL` dans
[`mobile/config.js`](mobile/config.js) puis recharge.

## Données et comptes de démonstration

L'original s'appuie sur le SDK Base44. Ici, la même surface d'API
(`api.auth`, `api.entities.X.list/filter/create/update/delete`,
`api.integrations.Core.UploadFile`, `api.functions.invoke`) est réimplémentée
dans [`src/api/client.js`](src/api/client.js) au-dessus de `localStorage`, avec
une couche `api.ops` qui porte les opérations sensibles et leurs contrôles
d'accès. Remplacer cet export par le client Base44 suffit à rebrancher le vrai
backend.

Douze événements couvrant sept pays sont fournis dans
[`src/api/seed.js`](src/api/seed.js), dont les six de l'application d'origine.
Mot de passe commun aux comptes de test : `kelbail123`.

| Email | Rôle |
|---|---|
| `admin@kelbail.com` | Administrateur : approbation des organisateurs, gestion des fraudes |
| `togoevents@kelbail.com` | Organisateur approuvé et vérifié, deux événements à Lomé |
| `sahelprod@kelbail.com` | Organisateur approuvé, événements au Sénégal, Bénin, Burkina et Niger |
| `livenation@kelbail.com`, `culturemali@kelbail.com`, `nightevents@kelbail.com`, `saintjean@kelbail.com` | Organisateurs approuvés |
| `poolparty@kelbail.com` | Organisateur en attente d'approbation |
| `staff@kelbail.com` | Staff de Togo Events, accède à l'onglet Scanner |
| `client@kelbail.com` | Acheteur avec un billet confirmé `TKT-DEMO2026` |

« Compte → Paramètres → Réinitialiser les données de démo » remet la base à zéro.

Les dates sont calculées au premier chargement par rapport au jour courant : un
événement ce soir, un demain, un ce week-end, et un complet pour la liste
d'attente. Sur l'original, elles étaient figées dans le passé, ce qui rendait les
filtres de date toujours vides.

## Pages

Reprises de l'original : accueil, recherche, fiche événement, création
d'événement, billets, compte, gestion organisateur avec validation des entrées,
profil organisateur, gestion du staff, scanner, tableau de bord admin, gestion
des fraudes, écran de démarrage animé, barre de navigation basse et page 404.

Ajoutées ici, car absentes ou « en construction » : connexion et inscription,
profil social, calendrier avec export `.ics`, alertes et préférences de
notification, favoris, versements, conversations acheteur-organisateur, aide et
FAQ, à propos avec conditions d'utilisation.

## Filtrage par pays et par ville

[`src/lib/geo.js`](src/lib/geo.js) décrit les huit pays de la zone F CFA, leurs
villes et leurs opérateurs Mobile Money. Le pays d'un événement est déduit de sa
ville quand il n'est pas renseigné, ce qui évite de casser les données
existantes.

- L'en-tête ouvre un sélecteur à deux niveaux, pays puis ville, qui n'affiche que
  les lieux ayant réellement des événements et indique leur nombre.
- Le choix est mémorisé et partagé entre l'accueil et la recherche.
- La recherche ajoute période, prix maximum, tri et inclusion des événements
  passés, avec des pastilles pour retirer chaque filtre un par un.
- La création d'événement impose le pays et propose les villes correspondantes.

## Sécurité

Correctifs apportés lors de l'audit :

- **Fuite de secrets.** `api.entities.User.filter()` renvoyait les comptes
  complets, empreinte de mot de passe comprise. Les lectures de la collection
  `User` sont désormais filtrées, et ces champs ne peuvent plus être écrits par
  une mise à jour ordinaire.
- **Mots de passe.** Le SHA-256 sans sel a été remplacé par PBKDF2-HMAC-SHA256
  avec un sel unique par compte, le nombre d'itérations étant enregistré avec
  l'empreinte. La comparaison se fait à temps constant.
- **Connexion impossible sur mobile.** `crypto.subtle` n'existe qu'en contexte
  sécurisé, donc pas sur l'adresse LAN utilisée par Expo Go : toute connexion
  échouait. [`src/lib/crypto.js`](src/lib/crypto.js) ajoute une implémentation
  JavaScript du même algorithme, vérifiée contre celle de Node, et réduit le coût
  quand elle doit prendre le relais.
- **Contrôles d'accès.** Valider un billet, annuler un événement, modifier une
  jauge, approuver un organisateur ou traiter un signalement passent par
  `api.ops`, qui vérifie que l'appelant est bien l'organisateur, un membre de son
  staff, ou un administrateur.
- **Élévation de privilèges.** `updateMe` ignore désormais le champ `role`.
- **Règles métier.** Le stock réel, le plafond de dix billets par personne, les
  dates passées, les événements annulés, les prix négatifs et les jauges
  inférieures aux ventes sont vérifiés à l'écriture, pas seulement dans
  l'interface.
- **Énumération de comptes.** Un mot de passe erroné et un email inconnu
  renvoient le même message.
- **Envois de fichiers.** Type et taille validés, quatre mégaoctets maximum.

Limite assumée : une application entièrement côté navigateur ne peut pas faire
respecter ses propres règles, puisque celui qui détient les données les contrôle.
Ces vérifications valent comme garde-fous et comme spécification de ce qu'un
serveur devrait appliquer.

## Apports inspirés des billetteries étrangères

- **Liste d'attente** sur les événements complets, comme Dice. L'organisateur voit
  le nombre de personnes en attente, et ouvrir des places les prévient
  automatiquement avant la remise en vente.
- **Suivi d'organisateur**, comme Shotgun : les abonnés sont notifiés à chaque
  publication.
- **Signaux de rareté et preuve sociale** sur les cartes et la fiche : « Plus que
  N places », « Se remplit vite », « N personnes y vont », jauge de remplissage,
  et repères temporels « Aujourd'hui », « Demain », « Dans 3 jours ».
- **Section « Ça se remplit »** classant les événements par taux de remplissage.
- **Paiement adapté au pays.** Les opérateurs proposés et le préfixe USSD suivent
  le pays de l'événement : T-Money et Flooz au Togo, Wave, Orange Money, MTN MoMo
  et Moov en Côte d'Ivoire, Wave et Free Money au Sénégal, et ainsi de suite.
- **Tableau de bord organisateur** avec taux de remplissage, taux de présence à
  l'entrée, recettes brutes et nettes, modification de jauge et annulation.
- **Projection de recettes** affichée pendant la création d'un événement.
- **Scan par caméra** via l'API BarcodeDetector, en plus de la saisie manuelle.
