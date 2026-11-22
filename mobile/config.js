// URL de l'app web Kel Bail chargée dans la WebView.
//
// Par défaut : l'URL publique HTTPS déployée automatiquement sur GitHub
// Pages (voir .github/workflows/deploy-pages.yml) à chaque push sur main.
// Comme c'est une adresse publique, Expo Go fonctionne depuis N'IMPORTE
// QUEL réseau — pas besoin que le téléphone soit sur le même Wi-Fi que le Mac.
//
// Pour développer en local à la place (rechargement instantané des
// changements de code, sans attendre un déploiement) : lance `npm run dev --
// --host` à la racine du projet, remplace la ligne ci-dessous par l'adresse
// LAN affichée (ex: 'http://192.168.1.18:5173') et assure-toi que le
// téléphone est sur le même Wi-Fi que le Mac.
export const APP_URL = 'https://naofadil.github.io/KELBAIL/';
