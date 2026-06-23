import { useState } from 'react'
import { ArrowLeft, Send, Mail, ArrowRight } from 'lucide-react' // Ajout de Mail et ArrowRight ici
import { Link } from 'react-router-dom'
import { authService } from '@/services/authService'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Bouton Retour stylisé */}
        <Link to="/login" className="back-to-login">
          <ArrowLeft size={16} />
          <span>Retour à la connexion</span>
        </Link>

        <div className="auth-header-reset">
          <h2 className="reset-title">Récupération de compte</h2>
          <p className="reset-subtitle">
            Saisissez votre adresse email professionnelle pour recevoir les instructions de réinitialisation.
          </p>
        </div>

        {sent ? (
          <div className="success-state">
            <div className="success-icon-wrap">
              <Send size={24} className="success-icon" />
            </div>
            <p className="success-title">Lien envoyé avec succès</p>
            <p className="success-text">
              Un message vient d'être envoyé à <strong>{email}</strong>. 
              Vérifiez vos courriers indésirables si vous ne recevez rien d'ici 2 minutes.
            </p>
            <button onClick={() => setSent(false)} className="btn-retry">
              Renvoyer un lien
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="input-label">EMAIL PROFESSIONNEL</label>
              <div className="input-control">
                <Mail size={18} className="field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@sbee.bj"
                  required
                  autoFocus
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-button">
              {loading ? (
                <div className="loader-spinner" />
              ) : (
                <>
                  ENVOYER LE LIEN DE RÉCUPÉRATION
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        )}

        <footer className="auth-footer">
          SBEE © {new Date().getFullYear()} · Direction des Systèmes d'Information
        </footer>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f0f2f5;
          font-family: 'Segoe UI', system-ui, sans-serif;
          padding: 20px;
        }

        .auth-card {
          background: #ffffff;
          width: 100%;
          max-width: 440px;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.05);
        }

        .back-to-login {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 32px;
          transition: color 0.2s;
        }

        .back-to-login:hover {
          color: #ed1f24;
        }

        .reset-title {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .reset-subtitle {
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 32px;
        }

        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #4b5563;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }

        .input-control {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-field {
          width: 100%;
          padding: 14px 14px 14px 46px;
          background-color: #ebf2ff;
          border: 1px solid #dce6f5;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }

        .input-field:focus {
          background-color: #fff;
          border-color: #ed1f24;
          box-shadow: 0 0 0 4px rgba(237, 31, 36, 0.08);
        }

        .field-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
        }

        .login-button {
          width: 100%;
          padding: 15px;
          background-color: #ed1f24;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          margin-top: 10px;
        }

        .success-state {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon-wrap {
          width: 60px;
          height: 60px;
          background-color: #f0fdf4;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .success-icon {
          color: #22c55e;
        }

        .success-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 10px;
        }

        .success-text {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .btn-retry {
          background: none;
          border: 1px solid #e2e8f0;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }

        .auth-footer {
          margin-top: 40px;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .loader-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}