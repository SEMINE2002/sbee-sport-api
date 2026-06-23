import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Si l'utilisateur est déjà connecté, on ne le laisse pas sur /login.
  // On le renvoie vers la destination prévue (state.from.pathname),
  // ou /dashboard par défaut (ex: "Espace membres").
  if (isAuthenticated) {
    const from = location.state?.from?.pathname ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}