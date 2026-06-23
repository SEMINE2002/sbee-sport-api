import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'

// Layouts
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Pages Auth
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

// Pages protégées
import DashboardPage from '@/pages/dashboard/DashboardPage'
import PersonnesPage from '@/pages/rh/PersonnesPage'
import PersonneDetailPage from '@/pages/rh/PersonneDetailPage'
import ContratsPage from '@/pages/rh/ContratsPage'
import SaisonsPage from '@/pages/organisation/SaisonsPage'
import DisciplineSectionManager from '@/pages/organisation/DisciplineSectionManager'
import EvenementsPage from '@/pages/sport/EvenementsPage'
import EvenementDetailPage from '@/pages/sport/EvenementDetailPage'
import TransactionsPage from '@/pages/finance/TransactionsPage'
import BudgetsPage from '@/pages/finance/BudgetsPage'
import StocksPage from '@/pages/inventaire/StocksPage'
import DotationsPage from '@/pages/inventaire/DotationsPage'
import RapportsPage from '@/pages/rapports/RapportsPage'
import UtilisateursPage from '@/pages/admin/UtilisateursPage'
import ProfilPage from '@/pages/profil/ProfilPage'
import AccesRefusePage from '@/pages/AccesRefusePage'
import NotFoundPage from '@/pages/NotFoundPage'

// Guards
import { PrivateRoute, RoleRoute } from '@/components/auth/PrivateRoute'
import PublicHomePage from '@/pages/public/PublicHomePage'

export default function App() {
  const { isAuthenticated, refreshUser } = useAuthStore()

  // Rafraîchit le profil au démarrage si connecté
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser()
    }
  }, [])

  return (
    <Routes>
      {/* ── Accès public (Page d'accueil et authentification) ── */}
      <Route path="/" element={<PublicHomePage />} />
      
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* ── Routes protégées (Administration, Gestion, etc.) ── */}
      <Route element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        {/* L'index /dashboard est accessible uniquement une fois connecté */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* RH */}
        <Route path="/personnes" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <PersonnesPage />
          </RoleRoute>
        } />
        <Route path="/personnes/:id" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <PersonneDetailPage />
          </RoleRoute>
        } />
        <Route path="/contrats" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <ContratsPage />
          </RoleRoute>
        } />

        {/* Organisation / Structure du Club */}
        <Route path="/discipline" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER']}>
            <DisciplineSectionManager />
          </RoleRoute>
        } />

        <Route path="/saisons" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER']}>
             <SaisonsPage />
          </RoleRoute>
        } />

        {/* Sport */}
        <Route path="/evenements" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION', 'COACH']}>
            <EvenementsPage />
          </RoleRoute>
        } />
        <Route path="/evenements/:id" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION', 'COACH']}>
            <EvenementDetailPage />
          </RoleRoute>
        } />

        {/* Finance */}
        <Route path="/budgets" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <BudgetsPage />
          </RoleRoute>
        } />
        <Route path="/transactions" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <TransactionsPage />
          </RoleRoute>
        } />

        {/* Inventaire */}
        <Route path="/stocks" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <StocksPage />
          </RoleRoute>
        } />
        <Route path="/dotations" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION']}>
            <DotationsPage />
          </RoleRoute>
        } />

        {/* Rapports (accès restreint aux profils ayant le lien dans la sidebar) */}
        <Route path="/rapports" element={
          <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER']}>
            <RapportsPage />
          </RoleRoute>
        } />

        {/* Admin */}
        <Route path="/utilisateurs" element={
          <RoleRoute roles={['SUPER_ADMIN']}>
            <UtilisateursPage />
          </RoleRoute>
        } />

        {/* Profil */}
        <Route path="/profil" element={<ProfilPage />} />

        {/* Erreurs */}
        <Route path="/acces-refuse" element={<AccesRefusePage />} />
        <Route path="*"            element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}