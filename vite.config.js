import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173 },
  // Chemin relatif : le build fonctionne tel quel qu'il soit servi à la
  // racine d'un domaine ou dans un sous-dossier (ex: GitHub Pages
  // https://<user>.github.io/KELBAIL/). Combiné à HashRouter (voir App.jsx),
  // aucune règle de réécriture serveur n'est nécessaire pour l'hébergement
  // statique.
  base: './',
})
