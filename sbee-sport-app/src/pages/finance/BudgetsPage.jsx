import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import {
  Wallet, Plus, Edit2, Save, X, Loader2, AlertCircle,
  TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp,
  PieChart,
} from 'lucide-react'
import useAuthStore from '@/store/authStore'

// ── Helpers ──
const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const pct = (depense, alloue) => alloue > 0 ? Math.min(Math.round((depense / alloue) * 100), 100) : 0

function ProgressBar({ value, max, color }) {
  const p = pct(value, max)
  const c = p >= 90 ? '#dc2626' : p >= 70 ? '#d97706' : '#22c55e'
  return (
    <div style={{ height: 6, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${p}%`, background: color ?? c, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════
export default function BudgetsPage() {
  const { user } = useAuthStore()
  
  // Gestion des rôles
  const isAdmin = ['SUPER_ADMIN', 'TRESORIER'].includes(user?.role_systeme)
  const isSponsor = user?.role_systeme === 'SPONSOR'
  const canSeeGlobalStats = isAdmin || isSponsor

  const [budgets, setBudgets]     = useState([])
  const [totaux, setTotaux]       = useState({})
  const [sections, setSections]   = useState([])
  const [saisons, setSaisons]     = useState([])
  const [saisonActive, setSaisonActive] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [expanded, setExpanded]   = useState({})

  // États du Modal création/édition
  const [showModal, setShowModal] = useState(false)
  const [editBudget, setEditBudget] = useState(null)
  const [isBudgetLocked, setIsBudgetLocked] = useState(false) // <-- État pour le verrouillage dynamique
  const [form, setForm] = useState({ section_id: '', saison_id: '', montant_alloue: '' })
  const [saving, setSaving]       = useState(false)
  const [formErrors, setFormErrors] = useState({})

  const fetchBudgets = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/budgets')
      setBudgets(data.budgets?.data ?? data.budgets ?? data.data ?? [])
      setTotaux(data.totaux ?? {})
    } catch {
      setError('Impossible de charger les budgets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBudgets()
    api.get('/sections').then(({ data }) => setSections(data.sections ?? data.data ?? [])).catch(() => {})
    api.get('/saisons').then(({ data }) => {
      const list = data.saisons ?? data.data ?? []
      setSaisons(list)
      setSaisonActive(list.find(s => s.is_active))
    }).catch(() => {})
  }, [fetchBudgets])

  function openCreate() {
    if (!isAdmin) return
    setEditBudget(null)
    setIsBudgetLocked(false) // Toujours déverrouillé à la création
    setForm({ section_id: '', saison_id: saisonActive?.id ?? '', montant_alloue: '' })
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(b) {
    if (!isAdmin) return
    setEditBudget(b)
    
    // Règle de gestion : Verrouillé si la section a déjà effectué des dépenses
    setIsBudgetLocked(Number(b.montant_depense) > 0)
    
    // Récupération des ID de manière robuste (gestion des objets imbriqués ou directs)
    const sectionId = b.section_id ?? b.section?.id
    const saisonId = b.saison_id ?? b.saison?.id

    // Pré-remplissage du formulaire en convertissant en String pour le <select>
    setForm({ 
      section_id: sectionId ? sectionId.toString() : '', 
      saison_id: saisonId ? saisonId.toString() : '', 
      montant_alloue: b.montant_alloue != null ? b.montant_alloue.toString() : '' 
    })
    
    setFormErrors({})
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!isAdmin) {
      setFormErrors({ global: "Action non autorisée pour votre profil." })
      return
    }

    const errs = {}
    if (!form.section_id)      errs.section_id      = 'Section obligatoire'
    if (!form.saison_id)       errs.saison_id       = 'Saison obligatoire'
    if (!form.montant_alloue)  errs.montant_alloue   = 'Montant obligatoire'
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        section_id:    Number(form.section_id),
        saison_id:     Number(form.saison_id),
        montant_alloue: Number(form.montant_alloue),
      }

      if (editBudget) {
        // Option A : Si ton Laravel tolère le PUT classique, on garde api.put
        const { data } = await api.put(`/budgets/${editBudget.id}`, payload)
        
        // Note : Si l'erreur 422 persiste après correction du contrôleur, 
        // commente la ligne du dessus et utilise l'Option B (POST sous forme de PUT) :
        // const { data } = await api.post(`/budgets/${editBudget.id}`, { ...payload, _method: 'PUT' })

        setBudgets(prevBudgets => 
          prevBudgets.map(b => b.id === editBudget.id ? { ...b, ...payload, ...data.budget } : b)
        )
      } else {
        await api.post('/budgets', payload)
      }
      
      setShowModal(false)
      fetchBudgets()
    } catch (err) {
      console.error("Erreur lors de l'enregistrement :", err)
      if (err.response?.status === 422) {
        // EXTRACTION ET AFFICHAGE DES ERREURS DE LARAVEL
        const backendErrors = err.response.data.errors ?? {}
        setFormErrors(backendErrors)
        
        // Petit hack pour afficher la première erreur de validation dans le message global
        const firstKey = Object.keys(backendErrors)[0]
        if (firstKey) {
          const msg = Array.isArray(backendErrors[firstKey]) ? backendErrors[firstKey][0] : backendErrors[firstKey]
          setFormErrors(prev => ({ ...prev, global: `Validation échouée : ${msg}` }))
        }
      } else {
        setFormErrors({ global: err.response?.data?.message ?? 'Erreur serveur lors de la mise à jour' })
      }
    } finally {
      setSaving(false)
    }
  }

  const pctGlobal = pct(totaux.total_depense, totaux.total_alloue)
  const couleurGlobal = pctGlobal >= 90 ? '#dc2626' : pctGlobal >= 70 ? '#d97706' : '#22c55e'

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Budgets des Sections
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 5, margin: 0 }}>
            {saisonActive ? `Saison ${saisonActive.nom}` : 'Toutes saisons'} · {budgets.length} section{budgets.length > 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchBudgets} style={{ padding: '9px 10px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {isAdmin && (
            <button onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              <Plus size={16} /> Allouer un budget
            </button>
          )}
        </div>
      </div>

      {/* Cartes synthèse */}
      {canSeeGlobalStats && totaux.total_alloue > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Budget total alloué', val: fmt(totaux.total_alloue), icon: <Wallet size={18}/>, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Total dépensé',       val: fmt(totaux.total_depense), icon: <TrendingDown size={18}/>, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Reste disponible',    val: fmt(totaux.total_restant), icon: <TrendingUp size={18}/>, color: '#059669', bg: '#f0fdf4' },
            { label: 'Consommation globale',val: `${pctGlobal}%`, icon: <PieChart size={18}/>, color: couleurGlobal, bg: '#fafafa' },
          ].map(({ label, val, icon, color, bg }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', lineHeight: 1, margin: 0 }}>{val}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, margin: 0 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barre globale */}
      {canSeeGlobalStats && totaux.total_alloue > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Consommation globale</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: couleurGlobal }}>{pctGlobal}%</span>
          </div>
          <ProgressBar value={totaux.total_depense} max={totaux.total_alloue} />
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, margin: 0 }}>
            {fmt(totaux.total_depense)} dépensé sur {fmt(totaux.total_alloue)} alloué · {fmt(totaux.total_restant)} restant
          </p>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* Liste budgets par section */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <Wallet size={40} style={{ margin: '0 auto 16px', color: '#d1d5db' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Aucun budget alloué</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Commencez par allouer un budget à chaque section</p>
          {isAdmin && (
            <button onClick={openCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              <Plus size={16} /> Allouer un budget
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {budgets.map(b => {
            const p       = pct(b.montant_depense, b.montant_alloue)
            const couleur = p >= 90 ? '#dc2626' : p >= 70 ? '#d97706' : '#22c55e'
            const isOpen  = expanded[b.id]

            return (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}
                  onClick={() => setExpanded(e => ({ ...e, [b.id]: !e[b.id] }))}>

                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {b.section?.discipline?.nom?.toLowerCase().includes('foot') ? '⚽' : b.section?.discipline?.nom?.toLowerCase().includes('bask') ? '🏀' : b.section?.discipline?.nom?.toLowerCase().includes('hand') ? '🤾' : '🏅'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{b.section?.nom}</p>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', fontWeight: 500 }}>
                        {b.section?.discipline?.nom}
                      </span>
                      {p >= 90 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>⚠ Budget critique</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ProgressBar value={b.montant_depense} max={b.montant_alloue} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: couleur, flexShrink: 0 }}>{p}%</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{fmt(b.montant_restant)}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>restant / {fmt(b.montant_alloue)}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); openEdit(b) }}
                        style={{ padding: '6px 8px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fafafa', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <Edit2 size={13} />
                      </button>
                    )}
                    {isOpen ? <ChevronUp size={16} style={{ color: '#9ca3af' }} /> : <ChevronDown size={16} style={{ color: '#9ca3af' }} />}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 20px', background: '#fafafa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Montant alloué',  val: fmt(b.montant_alloue),  color: '#2563eb' },
                        { label: 'Dépensé',          val: fmt(b.montant_depense), color: '#dc2626' },
                        { label: 'Reste',            val: fmt(b.montant_restant), color: '#059669' },
                        { label: 'Primes versées',   val: fmt(b.total_primes),    color: '#7c3aed' },
                        { label: 'Logistique',       val: fmt(b.total_logistique),color: '#d97706' },
                        { label: 'Salaires',         val: fmt(b.total_salaires),  color: '#374151' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                          <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4, margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 14, fontWeight: 700, color, margin: 0 }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          MODAL — Allouer / Modifier budget (SÉCURISÉ)
         ══════════════════════════════════════ */}
      {showModal && isAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, maxWidth: 440, width: '100%', padding: '24px 28px', animation: 'fadeIn 0.2s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                {editBudget ? 'Modifier le budget' : 'Allouer un budget'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: '#f5f5f5', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {formErrors.global && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {formErrors.global}
                </div>
              )}

              {/* Section - Pré-remplie et désactivée si dépensée */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Section *</label>
                <select 
                  value={form.section_id} 
                  onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                  disabled={isBudgetLocked}
                  style={{ ...inp, borderColor: formErrors.section_id ? '#ef4444' : '#e5e7eb', opacity: isBudgetLocked ? 0.65 : 1 }}>
                  <option value="">Choisir une section</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.nom} — {s.discipline?.nom}</option>)}
                </select>
                {formErrors.section_id && <p style={errStyle}>{Array.isArray(formErrors.section_id) ? formErrors.section_id[0] : formErrors.section_id}</p>}
              </div>

              {/* Saison - Pré-remplie et désactivée si dépensée */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Saison *</label>
                <select 
                  value={form.saison_id} 
                  onChange={e => setForm(f => ({ ...f, saison_id: e.target.value }))}
                  disabled={isBudgetLocked}
                  style={{ ...inp, borderColor: formErrors.saison_id ? '#ef4444' : '#e5e7eb', opacity: isBudgetLocked ? 0.65 : 1 }}>
                  <option value="">Choisir une saison</option>
                  {saisons.map(s => <option key={s.id} value={s.id}>{s.nom}{s.is_active ? ' ✓ Active' : ''}</option>)}
                </select>
                {formErrors.saison_id && <p style={errStyle}>{Array.isArray(formErrors.saison_id) ? formErrors.saison_id[0] : formErrors.saison_id}</p>}
              </div>

              {/* Montant - Reste toujours modifiable */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Montant alloué (FCFA) *</label>
                <input type="number" min={0} value={form.montant_alloue}
                  onChange={e => setForm(f => ({ ...f, montant_alloue: e.target.value }))}
                  placeholder="Ex: 10000000"
                  style={{ ...inp, borderColor: formErrors.montant_alloue ? '#ef4444' : '#e5e7eb' }} />
                {form.montant_alloue && (
                  <p style={{ fontSize: 12, color: '#059669', marginTop: 4, margin: '4px 0 0' }}>
                    = {Number(form.montant_alloue).toLocaleString('fr-FR')} FCFA
                  </p>
                )}
                {formErrors.montant_alloue && <p style={errStyle}>{Array.isArray(formErrors.montant_alloue) ? formErrors.montant_alloue[0] : formErrors.montant_alloue}</p>}
              </div>

              {editBudget && isBudgetLocked && (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: '1.4' }}>
                    🔒 <strong>Champs verrouillés :</strong> Des dépenses ont déjà été effectuées (<strong>{fmt(editBudget.montant_depense)}</strong>). Seul le montant global peut être ajusté à la hausse.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                  {editBudget ? 'Mettre à jour' : 'Allouer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin   { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 5, display: 'block' }
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Poppins, sans-serif', background: '#fafafa', boxSizing: 'border-box' }
const errStyle = { fontSize: 11, color: '#ef4444', marginTop: 3, margin: '3px 0 0' }