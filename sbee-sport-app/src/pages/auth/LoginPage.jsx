import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import useAuthStore from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname ?? '/dashboard'

 async function handleSubmit(e) {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      // On reste sur la page et on laisse l'erreur s'afficher (gérée par le store)
      console.error("Erreur de connexion", err)
    }
  }
  return (
  <div className="auth-wrapper">
    <div className="auth-card">
      
      {/* Header avec Logo et Branding */}
      <header className="auth-header">
        <div className="logo-container">
          <img src="/logo.svg" alt="SBEE" className="main-logo" />
        </div>
        
        <p className="auth-subtitle">Connectez-vous pour accéder à votre espace de gestion</p>
      </header>

      {/* Alerte Erreur Stylisée */}
      {error && (
        <div className="auth-error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label htmlFor="email">Email Professionnel</label>
          <div className="input-wrapper">
            <Mail className="field-icon" size={18} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="p.nom@sbee.bj"
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="input-group">
          <div className="label-row">
            <label htmlFor="password">Mot de passe</label>
            <Link to="/forgot-password" size={14} className="forgot-link">
              Oublié ?
            </Link>
          </div>
          <div className="input-wrapper">
            <Lock className="field-icon" size={18} />
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="submit-button">
          {isLoading ? (
            <span className="loader"></span>
          ) : (
            <>
             Se connecter
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <footer className="auth-footer">
        <p>&copy; {new Date().getFullYear()} Société Béninoise d'Énergie Électrique</p>
        <div className="footer-links">
          <span>Assistance technique</span>
          <span className="dot"></span>
          <span>Sécurité</span>
        </div>
      </footer>
    </div>

    <style>{`
      .auth-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f9fafb; /* Fond très léger */
        font-family: 'Inter', -apple-system, sans-serif;
      }

      .auth-card {
        width: 100%;
        max-width: 440px;
        background: #ffffff;
        padding: 48px;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid #f3f4f6;
      }

      .auth-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .main-logo {
        height: 64px;
        margin-bottom: 20px;
        
      }
      .logo-container{
      display: flex;
        justify-content: center;
        margin-bottom: 25px;
      }
      .auth-title {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 8px;
      }

      .auth-subtitle {
        font-size: 14px;
        color: #6b7280;
      }

      .input-group {
        margin-bottom: 20px;
      }

      .label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      label {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .forgot-link {
        color: #ed1f24;
        font-size: 13px;
        text-decoration: none;
        font-weight: 500;
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .field-icon {
        position: absolute;
        left: 12px;
        color: #9ca3af;
      }

      .form-input {
        width: 100%;
        padding: 12px 12px 12px 40px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 15px;
        color: #111827;
        transition: all 0.2s;
        background-color: #fff;
      }

      .form-input:focus {
        border-color: #ed1f24;
        box-shadow: 0 0 0 4px rgba(237, 31, 36, 0.1);
        outline: none;
      }

      .toggle-password {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
      }

      .submit-button {
        width: 100%;
        padding: 12px;
        background-color: #ed1f24;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: background 0.2s;
        margin-top: 12px;
      }

      .submit-button:hover {
        background-color: #d11a1f;
      }

      .auth-error-message {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background-color: #fef2f2;
        border: 1px solid #fee2e2;
        border-radius: 8px;
        color: #991b1b;
        font-size: 14px;
        margin-bottom: 24px;
      }

      .auth-footer {
        margin-top: 40px;
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
      }

      .footer-links {
        margin-top: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
      }

      .dot {
        width: 3px;
        height: 3px;
        background-color: #d1d5db;
        border-radius: 50%;
      }

      .loader {
        width: 20px;
        height: 20px;
        border: 2px solid #fff;
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        animation: rotation 1s linear infinite;
      }

      @keyframes rotation {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
}