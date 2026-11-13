import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import Layout from '@/components/Layout'
import SplashScreen from '@/components/SplashScreen'
import Home from '@/pages/Home'
import Search from '@/pages/Search'
import EventDetail from '@/pages/EventDetail'
import Sell from '@/pages/Sell'
import Tickets from '@/pages/Tickets'
import Account from '@/pages/Account'
import Management from '@/pages/Management'
import OrganizerProfile from '@/pages/OrganizerProfile'
import StaffScanner from '@/pages/StaffScanner'
import StaffManagement from '@/pages/StaffManagement'
import Admin from '@/pages/Admin'
import AdminFraud from '@/pages/AdminFraud'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Parametres from '@/pages/compte/Parametres'
import Profil from '@/pages/compte/Profil'
import Calendrier from '@/pages/compte/Calendrier'
import Alertes from '@/pages/compte/Alertes'
import Favoris from '@/pages/compte/Favoris'
import Versements from '@/pages/compte/Versements'
import Conversations from '@/pages/compte/Conversations'
import Aide from '@/pages/compte/Aide'
import Apropos from '@/pages/compte/Apropos'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })

export default function App() {
  const [ready, setReady] = useState(() => sessionStorage.getItem('kelbail_splash') === '1')
  const done = () => { sessionStorage.setItem('kelbail_splash', '1'); setReady(true) }
  return (
    <>
      {!ready && <SplashScreen onComplete={done} />}
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/vendre" element={<Sell />} />
              <Route path="/billets" element={<Tickets />} />
              <Route path="/compte" element={<Account />} />
              <Route path="/recherche" element={<Search />} />
              <Route path="/gestion" element={<Management />} />
              <Route path="/profil-organisateur" element={<OrganizerProfile />} />
              <Route path="/staff-scanner" element={<StaffScanner />} />
              <Route path="/staff-management" element={<StaffManagement />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/fraudes" element={<AdminFraud />} />
              <Route path="/compte/parametres" element={<Parametres />} />
              <Route path="/compte/profil" element={<Profil />} />
              <Route path="/compte/calendrier" element={<Calendrier />} />
              <Route path="/compte/alertes" element={<Alertes />} />
              <Route path="/compte/favoris" element={<Favoris />} />
              <Route path="/compte/versements" element={<Versements />} />
              <Route path="/compte/conversations" element={<Conversations />} />
              <Route path="/compte/aide" element={<Aide />} />
              <Route path="/compte/apropos" element={<Apropos />} />
            </Route>
            <Route path="/evenement/:id" element={<EventDetail />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors theme="dark" />
      </QueryClientProvider>
    </>
  )
}
