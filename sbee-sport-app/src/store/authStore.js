// src/store/authStore.js
import { create } from 'zustand';
import { authService } from '../services/authService';

const useAuthStore = create((set, get) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  // -----------------------------------------------------------
  // Actions
  // -----------------------------------------------------------

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      
      // On s'assure que le store est mis à jour de manière synchronisée
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur de connexion.';
      set({ isLoading: false, error: message, isAuthenticated: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch {
      // Même si l'appel API logout échoue, on vide le local
      localStorage.removeItem('sbee_token');
      localStorage.removeItem('sbee_user');
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  refreshUser: async () => {
    try {
      const user = await authService.me();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),

  // -----------------------------------------------------------
  // Helpers de rôle (utilisables dans les composants React)
  // -----------------------------------------------------------

  isSuperAdmin: () => get().user?.role_systeme === 'SUPER_ADMIN',
  isTresorier: () => get().user?.role_systeme === 'TRESORIER',
  isResponsableSection: () => get().user?.role_systeme === 'RESPONSABLE_SECTION',
  isCoach: () => get().user?.role_systeme === 'COACH',
  isMedecin: () => get().user?.role_systeme === 'MEDECIN',
  isJoueur: () => get().user?.role_systeme === 'JOUEUR',
  isSponsor: () => get().user?.role_systeme === 'SPONSOR',

  canAccessSection: (sectionId) => {
    return authService.hasAccessToSection(sectionId);
  },

  getAvalaibleRoles: () => {
    return ['SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION', 'COACH', 'MEDECIN', 'JOUEUR', 'SPONSOR'];
  }
}));

export default useAuthStore;