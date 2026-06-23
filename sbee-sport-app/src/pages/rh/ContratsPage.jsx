import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import {
  AlertTriangle, CheckCircle, Clock, RefreshCw,
  Search, Filter, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, X, Calendar, User,
  FileText, RotateCcw, XCircle, Zap
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

const STATUT = {
  ACTIF:    { label: 'Actif',    bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: <CheckCircle size={12}/> },
  BLESSE:   { label: 'Blessé',  bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: <AlertTriangle size={12}/> },
  SUSPENDU: { label: 'Suspendu',bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: <XCircle size={12}/> },
  ARCHIVE:  { label: 'Archivé', bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', icon: <XCircle size={12}/> },
}

const ROLE_LABEL = {
  JOUEUR: 'Joueur', COACH: 'Coach', STAFF: 'Staff',
  MEDECIN: 'Médecin', INTENDANT: 'Intendant',
}

function joursRestants(dateFin) {
  if (!dateFin) return null
  const diff = new Date(dateFin) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function BadgeExpiration({ dateFin, renouvelable }) {
  const jours = joursRestants(dateFin)
  if (jours === null) return null

  if (jours < 0) {
    return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600 }}>Expiré</span>
  }
  if (jours <= 30 && !renouvelable) {
    return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600 }}>⚠ {jours}j — Non Renouvelable</span>
  }
  if (jours <= 30 && renouvelable) {
    return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontWeight: 600 }}>🔄 {jours}j — Favorable</span>
  }
  if (jours <= 90) {
    return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600 }}>{jours}j restants</span>
  }
  return null
}

function Avatar({ photoUrl, nom, prenoms, size = 36 }) {
  const [err, setErr] = useState(false)
  const url = photoUrl ? (photoUrl.startsWith('http') ? photoUrl : `${API_BASE}/storage/${photoUrl}`) : null
  const initiales = `${prenoms?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 700, color: '#ed1f24', flexShrink: 0, overflow: 'hidden' }}>
      {url && !err
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} />
        : initiales}
    </div>
  )
}

export default function ContratsPage() {
  const [contrats, setContrats]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [alerteFilter, setAlerteFilter]   = useState('') 
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 })
  const [sections, setSections]     = useState([])
  const [stats, setStats]           = useState({ nb_actifs: 0, nb_expirant_bientot: 0, nb_renouvelables: 0, nb_expires: 0 })
  const [selected, setSelected]     = useState(null)  
  const [renewing, setRenewing]     = useState(null)  
  const [renewForm, setRenewForm]   = useState({ date_fin: '', note: '' })
  const [savingRenew, setSavingRenew] = useState(false)
  const [renewSuccess, setRenewSuccess] = useState(false)
  const [executingAuto, setExecutingAuto] = useState(false)

  useEffect(() => {
    api.get('/sections').then(({ data }) => setSections(data.sections ?? data.data ?? [])).catch(() => {})
  }, [])

  const fetchContrats = useCallback(async (page = 1) => {
    setLoading(true); setError(null)
    try {
      const params = {
        page,
        search:     search     || undefined,
        statut:     statutFilter || undefined,
        section_id: sectionFilter || undefined,
        alerte:     alerteFilter  || undefined,
      }
      const { data } = await api.get('/contrats', { params })
      setContrats(data.data ?? [])
      setPagination({ current: data.current_page ?? 1, last: data.last_page ?? 1, total: data.total ?? 0 })
      if (data.stats) setStats(data.stats)
    } catch {
      setError('Impossible de charger les contrats.')
    } finally {
      setLoading(false)
    }
  }, [search, statutFilter, sectionFilter, alerteFilter])

  useEffect(() => {
    const t = setTimeout(() => fetchContrats(1), 300)
    return () => clearTimeout(t)
  }, [fetchContrats])

  function openRenew(contrat) {
    const nouvelleFin = new Date(contrat.date_fin_contrat)
    nouvelleFin.setFullYear(nouvelleFin.getFullYear() + 1)
    setRenewForm({
      date_fin: nouvelleFin.toISOString().split('T')[0],
      note: '',
    })
    setRenewing(contrat)
    setRenewSuccess(false)
  }

  async function submitRenew(e) {
    e.preventDefault()
    setSavingRenew(true)
    try {
      await api.patch(`/contrats/${renewing.id}/statut`, {
        statut: 'ACTIF',
        date_fin_contrat: renewForm.date_fin,
        note_renouvellement: renewForm.note,
      })
      setRenewSuccess(true)
      fetchContrats(pagination.current)
      setTimeout(() => { setRenewing(null); setRenewSuccess(false) }, 2000)
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors du renouvellement.')
    } finally {
      setSavingRenew(false)
    }
  }

  async function handleAutoRenouveler() {
    if(!window.confirm("Voulez-vous vraiment lancer le renouvellement automatique pour tous les membres ayant un avis favorable (marqués comme renouvelables) expirant à moins de 30 jours ?")) return;
    setExecutingAuto(true)
    try {
      const { data } = await api.post('/contrats/auto-renouveler')
      alert(data.message)
      fetchContrats(1)
    } catch (err) {
      alert("Erreur lors de l'exécution automatique.")
    } finally {
      setExecutingAuto(false)
    }
  }

  async function changerStatut(contrat, newStatut) {
    try {
      await api.patch(`/contrats/${contrat.id}/statut`, { statut: newStatut })
      fetchContrats(pagination.current)
      setSelected(s => s ? { ...s, statut: newStatut } : null)
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur.')
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
            Gestion des Contrats
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            {pagination.total} contrat{pagination.total > 1 ? 's' : ''} trouvé(s) au total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleAutoRenouveler} disabled={executingAuto}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: '#059669', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            {executingAuto ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />} 
            Renouvellement Auto (Favorable)
          </button>
          <button onClick={() => fetchContrats(pagination.current)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── Cartes d'alerte Dynamiques branchées sur le Backend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        <AlertCard
          icon={<AlertTriangle size={18} />}
          label="Alerte 30 jours"
          sublabel="Non renouvelables"
          value={stats.nb_expirant_bientot}
          color="red"
          active={alerteFilter === 'expiration'}
          onClick={() => setAlerteFilter(a => a === 'expiration' ? '' : 'expiration')}
        />
        <AlertCard
          icon={<RotateCcw size={18} />}
          label="À reconduire"
          sublabel="Avis favorable"
          value={stats.nb_renouvelables}
          color="yellow"
          active={alerteFilter === 'renouvelable'}
          onClick={() => setAlerteFilter(a => a === 'renouvelable' ? '' : 'renouvelable')}
        />
        <AlertCard
          icon={<XCircle size={18} />}
          label="Expirés"
          sublabel="Contrats échus"
          value={stats.nb_expires}
          color="gray"
          active={alerteFilter === 'expires'}
          onClick={() => setAlerteFilter(a => a === 'expires' ? '' : 'expires')}
        />
        <AlertCard
          icon={<CheckCircle size={18} />}
          label="Actifs stables"
          sublabel="Dossiers en cours"
          value={stats.nb_actifs}
          color="green"
          active={false}
          onClick={() => setAlerteFilter('')}
        />
      </div>

      {/* ── Filtres ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Rechercher par nom de membre..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa' }} />
        </div>

        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', cursor: 'pointer', outline: 'none' }}>
          <option value="">Tous les statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="BLESSE">Blessé</option>
          <option value="SUSPENDU">Suspendu</option>
          <option value="ARCHIVE">Archivé</option>
        </select>

        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', cursor: 'pointer', outline: 'none' }}>
          <option value="">Toutes les sections</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>

        {alerteFilter && (
          <button onClick={() => setAlerteFilter('')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', fontSize: 12, color: '#dc2626', cursor: 'pointer' }}>
            <X size={13} /> Effacer filtre d'alerte
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Tableau principal ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Récupération des données...</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                    {['Membre', 'Section & Rôle', 'Validité du Contrat', 'Statut', 'Avis de fin', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contrats.length === 0 ? (
                  
                   <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                     <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <p>Aucun contrat trouvé</p>
                     </td></tr>
                    ) : contrats.map(c => {
                    const statut = STATUT[c.statut] ?? STATUT.ARCHIVE
                    const jours  = joursRestants(c.date_fin_contrat)
                    const alert  = jours !== null && jours <= 30
                    const expire = jours !== null && jours < 0

                    return (
                      <tr key={c.id}
                        style={{ borderBottom: '1px solid #f9f9f9', background: expire ? '#fffbf0' : alert && !c.renouvelable ? '#fff5f5' : 'transparent' }}>
                        
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar photoUrl={c.personne?.photo_url} nom={c.personne?.nom} prenoms={c.personne?.prenoms} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                {c.personne?.prenoms} {c.personne?.nom}
                              </p>
                              <p style={{ fontSize: 11, color: '#9ca3af' }}>{c.personne?.telephone || 'Pas de numéro'}</p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{c.section?.nom}</p>
                          <p style={{ fontSize: 11, color: '#ed1f24', fontWeight: 500 }}>
                            {ROLE_LABEL[c.type_role] ?? c.type_role} {c.poste_cle && `· ${c.poste_cle}`}
                          </p>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Calendar size={12} style={{ color: '#9ca3af' }} />
                            <div>
                              <p style={{ fontSize: 12, color: '#4b5563' }}>Du {c.date_debut_contrat ? new Date(c.date_debut_contrat).toLocaleDateString('fr-FR') : '—'}</p>
                              <p style={{ fontSize: 12, color: expire ? '#dc2626' : '#1a1a1a', fontWeight: alert ? 600 : 400 }}>Au {c.date_fin_contrat ? new Date(c.date_fin_contrat).toLocaleDateString('fr-FR') : '—'}</p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: statut.bg, color: statut.color, border: `1px solid ${statut.border}` }}>
                            {statut.icon} {statut.label}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <BadgeExpiration dateFin={c.date_fin_contrat} renouvelable={c.renouvelable} />
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setSelected(c)}
                              style={{ padding: '5px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', fontSize: 11, cursor: 'pointer' }}>
                              Détails
                            </button>
                            {(alert || expire) && c.statut === 'ACTIF' && (
                              <button onClick={() => openRenew(c)}
                                style={{ padding: '5px 10px', border: '1px solid #bbf7d0', borderRadius: 7, background: '#f0fdf4', fontSize: 11, color: '#059669', cursor: 'pointer', fontWeight: 500 }}>
                                Reconduire
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.last > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Page {pagination.current} sur {pagination.last}</p>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button disabled={pagination.current === 1} onClick={() => fetchContrats(pagination.current - 1)} style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
                  <button disabled={pagination.current === pagination.last} onClick={() => fetchContrats(pagination.current + 1)} style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer' }}><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL Détails ── */}
      {selected && (
        <ModalDetail
          contrat={selected}
          onClose={() => setSelected(null)}
          onRenew={() => { openRenew(selected); setSelected(null) }}
          onChangeStatut={changerStatut}
        />
      )}

      {/* ── MODAL Prolongation & Traitement de Renouvellement ── */}
      {renewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setRenewing(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, padding: '24px 28px' }} onClick={e => e.stopPropagation()}>
            {renewSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} style={{ color: '#059669', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 700 }}>Avenant de renouvellement validé !</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Renouvellement de Contrat</h3>
                  <X size={18} style={{ cursor: 'pointer' }} onClick={() => setRenewing(null)} />
                </div>
                <form onSubmit={submitRenew}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nouvelle date d'échéance du contrat</label>
                  <input type="date" value={renewForm.date_fin} onChange={e => setRenewForm(f => ({ ...f, date_fin: e.target.value }))} required style={{ width: '100%', padding: '8px', marginBottom: 14, borderRadius: 6, border: '1px solid #ccc' }} />
                  
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Note ou compte rendu de décision</label>
                  <textarea value={renewForm.note} rows={3} onChange={e => setRenewForm(f => ({ ...f, note: e.target.value }))} placeholder="Spécifier les raisons ou l'avenant approuvé..." style={{ width: '100%', padding: '8px', marginBottom: 16, borderRadius: 6, border: '1px solid #ccc' }} />

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setRenewing(null)} style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: 6, background: '#fff' }}>Annuler</button>
                    <button type="submit" disabled={savingRenew} style={{ padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
                      {savingRenew ? 'Enregistrement...' : 'Confirmer la reconduction'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCard({ icon, label, sublabel, value, color, active, onClick }) {
  const colors = {
    red:    { bg: active ? '#fef2f2' : '#fff', border: active ? '#fecaca' : '#e8e8e8', iconBg: '#fef2f2', iconColor: '#ef4444', valColor: '#dc2626' },
    yellow: { bg: active ? '#fffbeb' : '#fff', border: active ? '#fde68a' : '#e8e8e8', iconBg: '#fffbeb', iconColor: '#d97706', valColor: '#d97706' },
    green:  { bg: '#fff', border: '#e8e8e8', iconBg: '#f0fdf4', iconColor: '#059669', valColor: '#059669' },
    gray:   { bg: active ? '#f9fafb' : '#fff', border: active ? '#e5e7eb' : '#e8e8e8', iconBg: '#f9fafb', iconColor: '#6b7280', valColor: '#6b7280' },
  }
  const c = colors[color]
  return (
    <div onClick={onClick} style={{ padding: '14px 16px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.iconColor }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: c.valColor, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginTop: 2 }}>{label}</p>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>{sublabel}</p>
      </div>
    </div>
  )
}

function ModalDetail({ contrat: c, onClose, onRenew, onChangeStatut }) {
  const jours = joursRestants(c.date_fin_contrat)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Avatar photoUrl={c.personne?.photo_url} nom={c.personne?.nom} prenoms={c.personne?.prenoms} size={44} />
            <div>
              <h3 style={{ margin: 0 }}>{c.personne?.prenoms} {c.personne?.nom}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{ROLE_LABEL[c.type_role]} · {c.section?.nom}</p>
            </div>
          </div>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        {jours !== null && jours <= 30 && (
          <div style={{ padding: '10px', background: jours < 0 ? '#fef2f2' : '#fffbeb', borderRadius: 8, marginBottom: 14, fontSize: 12, color: jours < 0 ? '#dc2626' : '#b45309' }}>
            {jours < 0 ? `Alerte : Dossier expiré depuis ${Math.abs(jours)} jour(s).` : `Note : Le contrat prend fin dans ${jours} jours. Avis : ${c.renouvelable ? 'Favorable (Renouvelable)' : 'Défavorable (Bloqué)'}`}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Salaire de Base</span>
            <strong>{c.salaire_fixe > 0 ? `${Number(c.salaire_fixe).toLocaleString('fr-FR')} FCFA` : 'Primes Uniquement'}</strong>
          </div>
          <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Numéro de Licence</span>
            <strong>{c.numero_licence || 'En attente'}</strong>
          </div>
          <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Avis de Reconduction</span>
            <strong>{c.renouvelable ? 'Favorable (Auto)' : 'Non renouvelable'}</strong>
          </div>
          <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Statut Courant</span>
            <strong>{c.statut}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContente: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e8e8e8', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Fermer</button>
          {c.statut === 'ACTIF' && (
            <button onClick={onRenew} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Reconduire</button>
          )}
        </div>
      </div>
    </div>
  )
}