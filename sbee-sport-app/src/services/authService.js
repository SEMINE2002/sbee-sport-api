import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

// ── Instance axios globale ──
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// ── Intercepteur REQUEST : récupère dynamiquement le token à chaque appel ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sbee_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Intercepteur RESPONSE : gère le 401 ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sbee_token')
      localStorage.removeItem('sbee_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Service auth ──
export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('sbee_token', data.access_token)
    localStorage.setItem('sbee_user', JSON.stringify(data.user))
    
    // 🔥 AJOUTE CETTE LIGNE : Force Axios à utiliser le token immédiatement
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    
    return data
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('sbee_token')
      localStorage.removeItem('sbee_user')
      delete api.defaults.headers.common['Authorization']
    }
  },

  async me() {
    const { data } = await api.get('/auth/me')
    localStorage.setItem('sbee_user', JSON.stringify(data.user))
    return data.user
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('sbee_user')
      return user ? JSON.parse(user) : null
    } catch {
      return null
    }
  },

  getToken() {
    return localStorage.getItem('sbee_token')
  },

  isAuthenticated() {
    return !!localStorage.getItem('sbee_token')
  },

  hasRole(role) {
    return this.getCurrentUser()?.role_systeme === role
  },

  hasAccessToSection(sectionId) {
    const user = this.getCurrentUser()
    if (!user) return false
    if (user.role_systeme === 'SUPER_ADMIN') return true
    return user.sections?.some(s => s.id === parseInt(sectionId)) ?? false
  }
}

// 🔥 EXPORT PAR DÉFAUT CRITIQUE POUR LES PAGES (Discipline, etc.)
export default api;