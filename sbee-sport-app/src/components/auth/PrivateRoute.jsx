// src/components/auth/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

/**
 * Protège une route — redirige vers /login si non connecté
 */
export function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Protège une route selon le rôle
 * Usage : <RoleRoute roles={['SUPER_ADMIN', 'TRESORIER']}><MonPage /></RoleRoute>
 */
export function RoleRoute({ children, roles = [] }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role_systeme)) {
    return <Navigate to="/acces-refuse" replace />;
  }

  return children;
}

/**
 * Affiche du contenu uniquement si l'utilisateur a le bon rôle
 * Usage : <ShowIfRole roles={['TRESORIER']}><BoutonValider /></ShowIfRole>
 */
export function ShowIfRole({ children, roles = [] }) {
  const { user } = useAuthStore();

  if (roles.length === 0) return children;
  if (!roles.includes(user?.role_systeme)) return null;

  return children;
}

/**
 * Cache du contenu selon le rôle
 * Usage : <HideIfRole roles={['SPONSOR']}><DonneesPersonnelles /></HideIfRole>
 */
export function HideIfRole({ children, roles = [] }) {
  const { user } = useAuthStore();

  if (roles.includes(user?.role_systeme)) return null;

  return children;
}
