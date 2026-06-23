import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import {
  Plus, FileText, ChevronLeft, ChevronRight, RefreshCw,
  Loader2, AlertCircle, X, Save, Calendar, Filter,
  CheckCircle, XCircle, Clock, Download, Eye, AlertTriangle
} from 'lucide-react'

// ── CONFIGURATIONS VISUELLES DE L'APPLICATION ──
const CATEGORIE_CONFIG = {
  PRIME_MATCH:       { label: 'Prime Match', color: '#10b981', bg: '#ecfdf5' },
  PRIME_ENTRAINEMENT: { label: 'Prime Entraînement', color: '#059669', bg: '#f0fdf4' },
  SALAIRE:           { label: 'Salaire', color: '#2563eb', bg: '#eff6ff' },
  PRIME_SIGNATURE:   { label: 'Prime Signature', color: '#7c3aed', bg: '#faf5ff' },
  ACHAT_MATERIEL:    { label: 'Achat Matériel', color: '#d97706', bg: '#fffbeb' },
  TRANSPORT:         { label: 'Transport', color: '#4b5563', bg: '#f3f4f6' },
  HEBERGEMENT:       { label: 'Hébergement', color: '#6366f1', bg: '#e0e7ff' },
  MEDICAL:           { label: 'Médical', color: '#ef4444', bg: '#fef2f2' },
  ARBITRAGE:         { label: 'Arbitrage', color: '#db2777', bg: '#fdf2f8' },
  AUTRE:             { label: 'Autre', color: '#6b7280', bg: '#f9fafb' },
}

const STATUT_CONFIG = {
  EN_ATTENTE: { label: 'En attente N1', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  VALIDE_N1:  { label: 'Validé N1 (Attente N2)', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  VALIDE_N2:  { label: 'Approuvé & Débité', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  REJETE:     { label: 'Rejeté', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

export default function TransactionsPage() {
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [totaux, setTotaux] = useState({ en_attente: 0, valide_n1: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Structures secondaires pour formulaires
  const [sections, setSections] = useState([])
  const [budgetsDisponibles, setBudgetsDisponibles] = useState([])
  const [evenements, setEvenements] = useState([])
  const [contrats, setContrats] = useState([])

  // Filtres de recherche
  const [sectionFilter, setSectionFilter] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('DEBIT')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modals & Actions interactive
  const [showForm, setShowForm] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(null)
  const [motifRejet, setMotifRejet] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Récupération de l'utilisateur connecté au chargement
  useEffect(() => {
    const stored = localStorage.getItem('sbee_user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser(parsed)
      if (!['SUPER_ADMIN', 'TRESORIER'].includes(parsed.role_systeme)) {
        setSectionFilter(parsed.section_id ? String(parsed.section_id) : '')
      }
    }
  }, [])

  // Chargement des données structurelles nécessaires pour le filtrage et les formulaires
  useEffect(() => {
    if (!user) return

    // Charger les sections (filtré automatiquement si Responsable au backend)
    api.get('/sections').then(({ data }) => setSections(data.sections ?? data.data ?? data ?? []))
    
    // Charger les événements pour pouvoir lier une dépense (ex: prime de match)
    api.get('/evenements').then(({ data }) => setEvenements(data.evenements ?? data.data ?? []))

    // Charger les contrats en cours
    api.get('/contrats').then(({ data }) => setContrats(data.contrats ?? data.data ?? []))

    // Charger les lignes budgétaires actives pour y associer la transaction
    api.get('/budgets').then(({ data }) => {
      // Filtrage côté front par sécurité si le user est cantonné à une section
      const activeBudgets = data.budgets ?? data.data ?? []
      if (!['SUPER_ADMIN', 'TRESORIER'].includes(user.role_systeme)) {
        setBudgetsDisponibles(activeBudgets.filter(b => b.section_id === user.section_id))
      } else {
        setBudgetsDisponibles(activeBudgets)
      }
    })
  }, [user])

  // Fonction centrale de rafraîchissement de la liste des dépenses
  const fetchTransactions = useCallback(async (targetPage = 1) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: targetPage,
        section_id: sectionFilter || undefined,
        categorie:  categorieFilter || undefined,
        statut:     statutFilter || undefined,
        type:       typeFilter || undefined,
        date_debut: dateDebut || undefined,
        date_fin:   dateFin || undefined,
      }

      const { data } = await api.get('/transactions', { params })
      
      // Structure de pagination de Laravel (.paginate(20))
      setTransactions(data.transactions?.data ?? [])
      setTotalPages(data.transactions?.last_page ?? 1)
      setPage(data.transactions?.current_page ?? 1)
      if (data.totaux) setTotaux(data.totaux)
    } catch (err) {
      setError("Erreur lors de la récupération des opérations financières.")
    } finally {
      setLoading(false)
    }
  }, [user, sectionFilter, categorieFilter, statutFilter, typeFilter, dateDebut, dateFin])

  useEffect(() => {
    fetchTransactions(1)
  }, [fetchTransactions])

  // Workflow : Validation de Niveau 1
  async function handleValiderN1(id) {
    if (!window.confirm("Confirmer la validation de Niveau 1 pour cette dépense ?")) return
    setActionLoading(true)
    try {
      await api.patch(`/transactions/${id}/valider-n1`)
      fetchTransactions(page)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors de la validation N1")
    } finally {
      setActionLoading(false)
    }
  }

  // Workflow : Validation de Niveau 2 (Comptable / Trésorier)
  async function handleValiderN2(id) {
    if (!window.confirm("Approuver définitivement cette dépense ? Le budget de la section sera immédiatement impacté.")) return
    setActionLoading(true)
    try {
      await api.patch(`/transactions/${id}/valider-n2`)
      fetchTransactions(page)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors de la validation finale.")
    } finally {
      setActionLoading(false)
    }
  }

  // Workflow : Gestion du rejet d'une demande
  async function handleRejeterDépense(e) {
    e.preventDefault()
    if (!motifRejet.trim()) return
    setActionLoading(true)
    try {
      await api.patch(`/transactions/${showRejectModal}/rejeter`, { motif_rejet: motifRejet })
      setShowRejectModal(null)
      setMotifRejet('')
      fetchTransactions(page)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors du traitement du rejet.")
    } finally {
      setActionLoading(false)
    }
  }

  // Téléchargement sécurisé du justificatif via l'API (RG-FIN-03)
  function downloadJustificatif(id) {
    api.get(`/transactions/${id}/justificatif`, { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `justificatif_transaction_${id}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      })
      .catch(() => alert("Impossible de récupérer la pièce justificative."))
  }

  const isComptable = user?.role_systeme === 'SUPER_ADMIN' || user?.role_systeme === 'TRESORIER'

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      
      {/* ── ENTÊTE DE LA PAGE ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Suivi des Mouvements Financiers
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            Gestion des circuits d'approbations des dépenses et subventions de la SBEE.
          </p>
        </div>

        {user?.role_systeme === 'RESPONSABLE_SECTION' && (
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            <Plus size={16} /> Soumettre une Dépense
          </button>
        )}
      </div>

      {/* ── BLOCS DES TOTAUX D'ENGAGEMENT EN COURS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Dépenses en Attente N1</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {numberFormat(totaux.en_attente)} <span style={{ fontSize: 12, fontWeight: 500 }}>FCFA</span>
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Validées N1 (Attente Trésorerie)</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
            {numberFormat(totaux.valide_n1)} <span style={{ fontSize: 12, fontWeight: 500 }}>FCFA</span>
          </p>
        </div>
      </div>

      {/* ── BARRE DE FILTRAGE AVANCÉ ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, marginRight: 4 }}>
          <Filter size={14} /> Filtrer :
        </div>

        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
          disabled={!isComptable}
          style={selectStyle}>
          <option value="">Toutes les sections</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>

        <select value={categorieFilter} onChange={e => setCategorieFilter(e.target.value)} style={selectStyle}>
          <option value="">Toutes les catégories</option>
          {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={selectStyle}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={inputDateStyle} title="Date début" />
        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={inputDateStyle} title="Date fin" />

        <button onClick={() => fetchTransactions(1)} style={{ padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fafafa', cursor: 'pointer', color: '#6b7280' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── ZONE DE CONTENU PRINCIPAL ── */}
      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement comptable...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <FileText size={36} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Aucun enregistrement financier trouvé</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Modifiez vos critères de recherche ou soumettez un nouveau mouvement.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8e8e8', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Date & Libellé</th>
                <th style={{ padding: '12px 16px' }}>Section</th>
                <th style={{ padding: '12px 16px' }}>Catégorie</th>
                <th style={{ padding: '12px 16px' }}>Montant</th>
                <th style={{ padding: '12px 16px' }}>Statut Validation</th>
                <th style={{ padding: '12px 16px' }}>Pièce J.</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions Workflow</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const cat = CATEGORIE_CONFIG[t.categorie] ?? CATEGORIE_CONFIG.AUTRE
                const st = STATUT_CONFIG[t.statut_validation] ?? STATUT_CONFIG.EN_ATTENTE
                
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{t.libelle}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Calendar size={10} /> {t.date_transaction ? new Date(t.date_transaction).toLocaleDateString('fr-FR') : 'Non définie'}
                        {t.soumis_par_user && `• Par : ${t.soumis_par_user.name}`}
                      </div>
                      {t.statut_validation === 'REJETE' && t.motif_rejet && (
                        <div style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '4px 8px', borderRadius: 4, marginTop: 5, border: '1px solid #fecaca' }}>
                          <strong>Motif Rejet :</strong> {t.motif_rejet}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#4b5563', fontWeight: 500 }}>
                      {t.budget_section?.section?.nom ?? 'N/A'}
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{t.budget_section?.saison?.nom}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: cat.bg, color: cat.color, fontWeight: 600 }}>
                        {cat.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827', fontSize: 14 }}>
                      {numberFormat(t.montant)} <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>FCFA</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 600 }}>
                        <Clock size={11} /> {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {t.justificatif_url ? (
                        <button onClick={() => downloadJustificatif(t.id)}
                          style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontSize: 12, fontWeight: 600 }}
                          title="Télécharger le justificatif">
                          <Download size={14} /> PDF/Image
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Aucun</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        
                        {/* VALIDATION NIVEAU 1 : Visible par le Responsable ou Admin si statut EN_ATTENTE */}
                        {t.statut_validation === 'EN_ATTENTE' && 
                         (user?.role_systeme === 'RESPONSABLE_SECTION' || user?.role_systeme === 'SUPER_ADMIN') && 
                         t.soumis_par !== user?.id && (
                          <button onClick={() => handleValiderN1(t.id)} disabled={actionLoading}
                            style={{ padding: '5px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Valider N1
                          </button>
                        )}

                        {/* VALIDATION NIVEAU 2 FINALE : Réservé exclusivement au Trésorier ou SuperAdmin si VALIDE_N1 */}
                        {t.statut_validation === 'VALIDE_N1' && isComptable && (
                          <button onClick={() => handleValiderN2(t.id)} disabled={actionLoading}
                            style={{ padding: '5px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Approuver (N2)
                          </button>
                        )}

                        {/* REJET ACCESSIBLE TANT QUE LA TRANSACTION N'EST PAS EN VALIDE_N2 */}
                        {['EN_ATTENTE', 'VALIDE_N1'].includes(t.statut_validation) && 
                         (isComptable || user?.role_systeme === 'RESPONSABLE_SECTION') && (
                          <button onClick={() => setShowRejectModal(t.id)} disabled={actionLoading}
                            style={{ padding: '5px 10px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                            Rejeter
                          </button>
                        )}

                        {/* Si aucune action n'est possible */}
                        {t.statut_validation === 'VALIDE_N2' && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Écriture Archivée
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* SYSTEME DE PAGINATION */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Page {page} sur {totalPages}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 1} onClick={() => fetchTransactions(page - 1)} style={pagibtn}><ChevronLeft size={14} /></button>
                <button disabled={page === totalPages} onClick={() => fetchTransactions(page + 1)} style={pagibtn}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          MODAL : SOUMISSION D'UNE DEPENSE
      ══════════════════════════════════════ */}
      {showForm && (
        <ModalSoumissionDepense
          budgets={budgetsDisponibles}
          evenements={evenements}
          contrats={contrats}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchTransactions(1) }}
        />
      )}

      {/* ══════════════════════════════════════
          MODAL : SAISIE DU MOTIF DE REJET
      ══════════════════════════════════════ */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 420, width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>Rejeter la demande de financement</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Veuillez spécifier un motif explicite. Ce motif sera envoyé par notification au demandeur.</p>
            <form onSubmit={handleRejeterDépense}>
              <textarea required value={motifRejet} onChange={e => setMotifRejet(e.target.value)}
                placeholder="Ex: Justificatif illisible ou montant non conforme..."
                style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Poppins', minHeight: 80, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={() => { setShowRejectModal(null); setMotifRejet('') }} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Confirmer le Rejet</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// ── COMPOSANT MODAL ENFANT POUR LE FORMULAIRE DE SOUMISSION ──
function ModalSoumissionDepense({ budgets, evenements, contrats, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [justificatifFile, setJustificatifFile] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  
  const [form, setForm] = useState({
    budget_section_id: '',
    categorie: 'PRIME_MATCH',
    montant: '',
    libelle: '',
    date_transaction: new Date().toISOString().split('T')[0],
    evenement_id: '',
    contrat_id: '',
  })

  // Vérification instantanée RG-FIN-03 à l'écriture
  const categoriesAvecJustificatifObligatoire = ['ACHAT_MATERIEL', 'TRANSPORT', 'HEBERGEMENT', 'ARBITRAGE', 'AUTRE']
  constisJustifRequired = categoriesAvecJustificatifObligatoire.includes(form.categorie)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setValidationErrors(err => ({ ...err, [e.target.name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Validation RG-FIN-03 côté Front avant envoi
    if (isJustifRequired && !justificatifFile) {
      setValidationErrors(err => ({ ...err, justificatif: "RG-FIN-03 : Un justificatif physique (facture/reçu) est obligatoire pour cette catégorie de dépenses." }))
      return
    }

    setSaving(true)
    try {
      // Construction du FormData pour le téléversement de fichiers (justificatif)
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value)
      })
      if (justificatifFile) {
        formData.append('justificatif', justificatifFile)
      }

      await api.post('/transactions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      onSaved()
    } catch (err) {
      if (err.response?.status === 422) {
        setValidationErrors(err.response.data.errors ?? { message: err.response.data.message })
      } else {
        alert(err.response?.data?.message ?? "Erreur lors de la soumission.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Créer une demande d'engagement</h2>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        {validationErrors.message && (
          <div style={{ padding: '10px 12px', background: '#fef2f2', color: '#dc2626', fontSize: 12, borderRadius: 8, marginBottom: 12, borderLeft: '3px solid #ef4444', fontWeight: 500 }}>
            ⚠️ {validationErrors.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Ligne Budgétaire Sportive Affectée *</label>
            <select required name="budget_section_id" value={form.budget_section_id} onChange={handleChange} style={inputStyle}>
              <option value="">Sélectionner le budget cible</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.section?.nom} ({b.saison?.nom}) — Restant : {numberFormat(b.montant_restant)} F
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Libellé explicite de l'opération *</label>
            <input required type="text" name="libelle" value={form.libelle} onChange={handleChange} placeholder="Ex: Achat de 15 paires de crampons Puma" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Catégorie de charge *</label>
            <select name="categorie" value={form.categorie} onChange={handleChange} style={inputStyle}>
              {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Montant (FCFA) *</label>
            <input required type="number" name="montant" value={form.montant} onChange={handleChange} min="1" placeholder="Montant en FCFA" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Date d'engagement *</label>
            <input required type="date" name="date_transaction" value={form.date_transaction} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Événement lié (Optionnel)</label>
            <select name="evenement_id" value={form.evenement_id} onChange={handleChange} style={inputStyle}>
              <option value="">Aucun</option>
              {evenements.map(e => <option key={e.id} value={e.id}>{e.adversaire ? `Match vs ${e.adversaire}` : e.titre}</option>)}
            </select>
          </div>

          {/* RG-FIN-03 : BLOC JUSTIFICATIF DYNAMIQUE */}
          <div style={{ gridColumn: 'span 2', background: isJustifRequired ? '#fffbeb' : '#fafafa', padding: 12, borderRadius: 8, border: isJustifRequired ? '1px solid #fde68a' : '1px solid #e5e7eb', marginTop: 4 }}>
            <label style={labelStyle}>
              Pièce Justificative {isJustifRequired ? <span style={{ color: '#dc2626' }}>* (Obligatoire pour cette catégorie)</span> : '(Optionnel)'}
            </label>
            <input type="file" accept="image/*,application/pdf" onChange={e => { setJustificatifFile(e.target.files[0]); setValidationErrors(err => ({ ...err, justificatif: undefined })) }} style={{ marginTop: 6, fontSize: 12 }} />
            {validationErrors.justificatif && (
              <p style={{ color: '#ef4444', fontSize: 11, margin: '6px 0 0', fontWeight: 600 }}>{validationErrors.justificatif}</p>
            )}
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Soumettre la demande
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

// ── UTILS DE STYLE REUTILISABLES ──
const selectStyle = { padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', outline: 'none', cursor: 'pointer', fontFamily: 'Poppins' }
const inputDateStyle = { padding: '7px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', outline: 'none', fontFamily: 'Poppins' }
const pagibtn = { padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer' }
const labelStyle = { fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Poppins', background: '#fafafa', boxSizing: 'border-box' }

function numberFormat(num) {
  if (!num) return '0'
  return parseFloat(num).toLocaleString('fr-FR')
}