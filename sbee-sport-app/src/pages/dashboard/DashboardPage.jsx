import { useState, useEffect } from 'react'
import api from '@/services/authService'
import useAuthStore from '@/store/authStore'
import { Users, Calendar, Wallet, Receipt, Shield, TrendingUp, CheckCircle, RefreshCw, Bell, FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // États de chargement pour les exports administratifs
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  // Récupération du rôle pour gérer les affichages conditionnels
  const currentRole = user?.role_systeme || 'COACH'
  const isSuperAdmin = currentRole === 'SUPER_ADMIN'
  const isTresorier = currentRole === 'TRESORIER'
  
  // Seuls le Super Admin et le Trésorier ont le droit de voir la zone de téléchargement
  const canSeeReports = isSuperAdmin || isTresorier

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => {
        if (res.data && res.data.data) {
          setStats(res.data.data)
        } else if (res.data) {
          setStats(res.data)
        }
      })
      .catch(err => console.error("Erreur de chargement du dashboard", err))
      .finally(() => setLoading(false))
  }, [])

  const handleDownloadReport = async (format) => {
    const isPdf = format === 'pdf'
    if (isPdf) setLoadingPdf(true); else setLoadingExcel(true)

    try {
      const endpoint = isPdf ? '/rapports/export-pdf' : '/rapports/export-excel'
      const response = await api.get(endpoint, { responseType: 'blob' })

      const mimeType = isPdf 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

      const blob = new Blob([response.data], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Bilan_Financier_SBEE_${new Date().getFullYear()}.${isPdf ? 'pdf' : 'xlsx'}`)
      
      document.body.appendChild(link)
      link.click()
      
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(`Erreur d'exportation ${format}:`, error)
      alert("Impossible de compiler le rapport. Vérifiez vos accès de sécurité.")
    } finally {
      if (isPdf) setLoadingPdf(false); else setLoadingExcel(false)
    }
  }

  if (loading) {
    return (
      <div style={skeletonContainer}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#ed1f24', marginBottom: 12 }} />
        <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500 }}>Synchronisation des données financières...</p>
      </div>
    )
  }

  const formatFCFA = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val || 0).replace('XOF', 'FCFA')
  }

  const budgetAlloue = stats?.montant_alloue ?? 0
  const depensesEffectuees = stats?.montant_depense ?? 0
  const soldeRestant = stats?.montant_restant ?? 0

  const tauxExecution = budgetAlloue > 0 ? ((depensesEffectuees / budgetAlloue) * 100).toFixed(1) : 0

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Message de bienvenue */}
      <div style={welcomeRowStyle}>
        <div>
          <h1 style={titleStyle}>Tableau de Bord <span>SBEE Sport</span></h1>
          <p style={subtitleStyle}>Suivi budgétaire et logistique en temps réel.</p>
        </div>
        <div style={badgeRoleStyle}>
          <Shield size={14} style={{ color: '#ed1f24' }} />
          <span>{currentRole}</span>
        </div>
      </div>

      {canSeeReports && (
        <div style={reportBannerStyle}>
          <div style={reportLeftBlockStyle}>
            <div style={downloadIconBoxStyle}>
              <Download size={20} style={{ color: '#ed1f24' }} />
            </div>
            <div>
              <h3 style={reportTitleStyle}>Rapports d'activités et Bilans</h3>
              <p style={reportSubtitleStyle}>
                {isSuperAdmin 
                  ? "Génération des bilans sportifs complets et comptabilités multi-onglets." 
                  : "Accès restreint au suivi budgétaire général et livre des comptes."}
              </p>
            </div>
          </div>

          <div style={actionsContainerStyle}>
            {isSuperAdmin && (
              <button
                onClick={() => handleDownloadReport('pdf')}
                disabled={loadingPdf || loadingExcel}
                style={{ 
                  ...buttonBaseStyle, 
                  backgroundColor: loadingPdf || loadingExcel ? '#e2e8f0' : '#ed1f24',
                  color: loadingPdf || loadingExcel ? '#94a3b8' : '#ffffff',
                  cursor: loadingPdf || loadingExcel ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                <span>{loadingPdf ? 'Génération PDF...' : 'Bilan Général'}</span>
              </button>
            )}

            <button
              onClick={() => handleDownloadReport('excel')}
              disabled={loadingPdf || loadingExcel}
              style={{ 
                ...buttonBaseStyle, 
                backgroundColor: loadingPdf || loadingExcel ? '#e2e8f0' : '#10b981',
                color: loadingPdf || loadingExcel ? '#94a3b8' : '#ffffff',
                cursor: loadingPdf || loadingExcel ? 'not-allowed' : 'pointer'
              }}
            >
              {loadingExcel ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
              <span>{loadingExcel ? 'Livre de Caisse...' : 'Exporter le Budget'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grille des 4 indicateurs principaux */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>Effectif Global</span>
          </div>
          <div style={cardValueStyle}>{stats?.membres_count ?? 0}</div>
          <p style={cardSubStyle}>Athlètes et personnels</p>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>Evenements</span>
          </div>
          <div style={cardValueStyle}>{stats?.evenements_count ?? 0}</div>
          <p style={cardSubStyle}>Activités enregistrées</p>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>Enveloppe Budgetaire</span>
          </div>
          <div style={cardValueStyle}>{formatFCFA(budgetAlloue)}</div>
          <p style={cardSubStyle}>Cumul des budgets alloués</p>
        </div>

        <div style={{ ...cardStyle, borderLeft: `4px solid #10b981` }}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>Montant Restant</span>
          </div>
          <div style={{ ...cardValueStyle, color: '#10b981' }}>
            {formatFCFA(soldeRestant)}
          </div>
          <p style={cardSubStyle}>Disponible en caisse centrale</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
        <div style={tableSectionStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={sectionTitleStyle}>Suivi de Consommation Budgetaire</h3>
            <TrendingUp size={16} style={{ color: '#64748b' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: '#475569' }}>Depenses Effectuees</span>
                <span style={{ color: '#ed1f24' }}>{formatFCFA(depensesEffectuees)}</span>
              </div>
              <div style={{ width: '100%', height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${tauxExecution}%`, minWidth: '2%', height: '100%', background: 'linear-gradient(90deg, #ed1f24, #b91c1c)', borderRadius: 6, transition: 'width 0.5s ease-in-out' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                <span>Taux de consommation : {tauxExecution}%</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Regle de gestion</span>
                <p style={{ fontSize: 12, color: '#1e293b', margin: '4px 0 0 0', fontWeight: 500 }}>RG-FIN-01 : Mis a jour a chaque transaction validee</p>
              </div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Integrite</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                   Sommes consolidees
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={tableSectionStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={sectionTitleStyle}>Flux Metiers</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={activityRowStyle}><p style={activityTextStyle}><strong>Finances :</strong> Consolidation des budgets de sections</p></div>
            <div style={activityRowStyle}><p style={activityTextStyle}><strong>Supervision :</strong> Droits d'acces globaux actives</p></div>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ── OBJETS DE STYLES CSS-IN-JS ── */
const containerStyle = { padding: '30px 40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }
const welcomeRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }
const titleStyle = { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }
const subtitleStyle = { fontSize: 14, color: '#64748b', margin: '4px 0 0 0' }
const badgeRoleStyle = { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '8px 14px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }

const reportBannerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '18px 24px', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24, gap: 16, flexWrap: 'wrap' }
const reportLeftBlockStyle = { display: 'flex', alignItems: 'center', gap: 14 }
const downloadIconBoxStyle = { background: '#fef2f2', padding: 10, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const reportTitleStyle = { fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }
const reportSubtitleStyle = { fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }
const actionsContainerStyle = { display: 'flex', alignItems: 'center', gap: 12 }
const buttonBaseStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', transition: 'all 0.15s ease-in-out', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }
const cardStyle = { background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }
const cardTitleStyle = { fontSize: 13, fontWeight: 600, color: '#64748b' }
const iconWrapperStyle = { background: '#f8fafc', padding: 8, borderRadius: 10, border: '1px solid #f1f5f9' }
const cardValueStyle = { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '4px 0' }
const cardSubStyle = { fontSize: 11, color: '#94a3b8', margin: 0 }
const tableSectionStyle = { background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }
const sectionHeaderStyle = { display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }
const sectionTitleStyle = { margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }
const activityRowStyle = { padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }
const activityTextStyle = { fontSize: 12, color: '#475569', margin: 0 }
const skeletonContainer = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }