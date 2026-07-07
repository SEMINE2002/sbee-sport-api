import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/authService'
import {
  Plus, Calendar, ChevronLeft, ChevronRight, RefreshCw,
  Loader2, AlertCircle, X, Save, Clock, MapPin,
  Users, Trophy, Target, CheckCircle, XCircle,
  Edit2, Trash2, Eye, Shield, HelpCircle, Lock
} from 'lucide-react'

// ── Configs ──
const TYPE_CONFIG = {
  MATCH:        { label: 'Match',         bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#ef4444', icon: '⚽' },
  ENTRAINEMENT: { label: 'Entraînement',  bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', dot: '#3b82f6', icon: '🏃' },
}

const STATUT_CONFIG = {
  PLANIFIE:  { label: 'Planifié',  bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  EN_COURS:  { label: 'En cours',  bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  TERMINE:   { label: 'Terminé',   bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  ANNULE:    { label: 'Annulé',    bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  REPORTE:   { label: 'Reporté',   bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
}

const RESULTAT_CONFIG = {
  VICTOIRE: { label: 'Victoire', color: '#059669', bg: '#f0fdf4' },
  DEFAITE:  { label: 'Défaite',  color: '#dc2626', bg: '#fef2f2' },
  NUL:      { label: 'Nul',      color: '#d97706', bg: '#fffbeb' },
}

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS_COURTS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

// ══════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════
export default function EvenementsPage() {
  const navigate = useNavigate()
  const [user, setUser]         = useState(null)
  const [vue, setVue]           = useState('liste')  // 'liste' | 'calendrier'
  const [evenements, setEvenements] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 })
  const [sections, setSections] = useState([])
  const [saisonActive, setSaisonActive] = useState(null)

  // Calendrier
  const now = new Date()
  const [calMois, setCalMois]   = useState(now.getMonth())
  const [calAnnee, setCalAnnee] = useState(now.getFullYear())

  // Modals
  const [showForm, setShowForm]     = useState(false)
  const [editEvt, setEditEvt]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [dateSelectionnee, setDateSelectionnee] = useState(null)
  const [competitions, setCompetitions] = useState([])
  
  const safeEvenements = Array.isArray(evenements) ? evenements : []

  // Récupération initiale de l'utilisateur connecté
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sbee_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        if (parsed.role_systeme === 'RESPONSABLE_SECTION' || parsed.role_systeme === 'COACH') {
          setSectionFilter(parsed.section_id ? String(parsed.section_id) : '')
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Chargement initial des données de structure
  useEffect(() => {
    if (!user) return

    const params = {}
    if (user.role_systeme === 'RESPONSABLE_SECTION' || user.role_systeme === 'COACH') {
      params.section_id = user.section_id
    }

    api.get('/sections', { params })
      .then(({ data }) => setSections(data.sections ?? data.data ?? data ?? []))
      .catch(() => {})

    api.get('/saisons')
      .then(({ data }) => {
        const listeSaisons = data.saisons ?? data.data ?? data ?? []
        if (Array.isArray(listeSaisons)) {
          const active = listeSaisons.find(s => s.active === true || s.active === 1 || s.is_active === 1 || s.is_active === true)
          if (active) setSaisonActive(active)
        }
      })
      .catch(() => {})
  }, [user])

  const fetch = useCallback(async (page = 1) => {
    if (!user) return
    setLoading(true); setError(null)
    try {
      const params = {
        page,
        search:     search     || undefined,
        type:       typeFilter  || undefined,
        statut:     statutFilter || undefined,
      }

      if (user.role_systeme === 'RESPONSABLE_SECTION' || user.role_systeme === 'COACH') {
        params.section_id = user.section_id
      } else if (sectionFilter) {
        params.section_id = sectionFilter
      }

      const { data } = await api.get('/evenements', { params })
      
      if (data) {
        if (Array.isArray(data.data)) {
          setEvenements(data.data)
        } else if (Array.isArray(data.evenements)) {
          setEvenements(data.evenements)
        } else if (Array.isArray(data)) {
          setEvenements(data)
        } else {
          setEvenements([])
        }
      } else {
        setEvenements([])
      }

      setPagination({ 
        current: data?.current_page ?? 1, 
        last: data?.last_page ?? 1, 
        total: data?.total ?? (data?.data ? data.data.length : (Array.isArray(data) ? data.length : 0)) 
      })
    } catch (err) {
      setError('Impossible de charger les événements.')
      setEvenements([])
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statutFilter, sectionFilter, user])

  useEffect(() => {
    const t = setTimeout(() => fetch(1), 300)
    return () => clearTimeout(t)
  }, [fetch])

  useEffect(() => {
    api.get('/competitions').then(res => setCompetitions(res.data)).catch(() => {})
  }, [])

  async function supprimerEvt(id) {
    try {
      await api.delete(`/evenements/${id}`)
      setConfirmDel(null)
      fetch(pagination.current)
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors de la suppression.')
    }
  }

  async function toggleVerrouillage(evt) {
    const action = evt.is_verrouille ? 'decloturer' : 'cloturer';
    const messageConfirmation = evt.is_verrouille 
      ? "Voulez-vous déclôturer cet événement ? Les modifications seront à nouveau autorisées."
      : "Voulez-vous clôturer cet événement ? Les données seront verrouillées.";

    if (!window.confirm(messageConfirmation)) return;

    try {
      await api.post(`/evenements/${evt.id}/${action}`);
      fetch(pagination.current); 
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors du changement de statut de clôture.");
    }
  }

  function getEvenementsJour(jour) {
    return safeEvenements.filter(e => {
      if (!e || !e.date_heure) return false
      const d = new Date(e.date_heure)
      return d.getDate() === jour && d.getMonth() === calMois && d.getFullYear() === calAnnee
    })
  }

  function joursCalendrier() {
    const premier = new Date(calAnnee, calMois, 1)
    const dernier = new Date(calAnnee, calMois + 1, 0)
    const debutSemaine = (premier.getDay() + 6) % 7
    const jours = []
    for (let i = 0; i < debutSemaine; i++) jours.push(null)
    for (let i = 1; i <= dernier.getDate(); i++) jours.push(i)
    return jours
  }

  const canWrite = user?.role_systeme === 'SUPER_ADMIN' || user?.role_systeme === 'RESPONSABLE_SECTION'

  return (
    <div>
      {/* Bandeau d'avertissement si pas de saison active */}
      {!saisonActive && !loading && (
        <div style={{ display: 'flex', gap: 12, padding: '14px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 20, fontSize: 13, color: '#b45309', alignItems: 'center' }}>
          <AlertCircle size={18} style={{ flexShrink: 0, color: '#d97706' }} />
          <div>
            <strong>Attention : Aucune saison sportive n'est active actuellement.</strong>
            <p style={{ margin: '2px 0 0', opacity: 0.8 }}>Vous devez activer une saison dans la configuration avant de pouvoir créer ou planifier des événements.</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
            Calendrier Sportif {saisonActive && <span style={{ color: '#ed1f24', fontSize: 14, fontWeight: 500, marginLeft: 8 }}>({saisonActive.nom})</span>}
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            {pagination.total} événement{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
            {['liste', 'calendrier'].map(v => (
              <button key={v} onClick={() => setVue(v)}
                style={{ padding: '8px 14px', border: 'none', background: vue === v ? '#ed1f24' : '#fff', color: vue === v ? '#fff' : '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: vue === v ? 600 : 400 }}>
                {v === 'liste' ? ' Liste' : ' Calendrier'}
              </button>
            ))}
          </div>
          {canWrite && (
            <button 
              disabled={!saisonActive}
              onClick={() => { setEditEvt(null); setDateSelectionnee(null); setShowForm(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: saisonActive ? '#ed1f24' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saisonActive ? 'pointer' : 'not-allowed', fontFamily: 'Poppins, sans-serif' }}>
              Nouvel Événement
            </button>
          )}
        </div>
      </div>

      {/* ── Filtres ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, fontFamily: 'Poppins, sans-serif', outline: 'none', background: '#fafafa' }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', outline: 'none' }}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', outline: 'none' }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select 
          value={sectionFilter} 
          onChange={e => { setSectionFilter(e.target.value); setPagination(p => ({ ...p, current: 1 })); }}
          disabled={user?.role_systeme === 'RESPONSABLE_SECTION' || user?.role_systeme === 'COACH'}
          style={{ padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Toutes les sections</option>
          {Array.isArray(sections) && sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <button onClick={() => fetch(pagination.current)}
          style={{ padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fafafa', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement...</p>
        </div>
      ) : vue === 'liste' ? (

        /* ══════════════════════════════════════
            VUE LISTE
        ══════════════════════════════════════ */
        <div>
          {safeEvenements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
              <Calendar size={40} style={{ margin: '0 auto 16px', color: '#d1d5db' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Aucun événement trouvé</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Planifiez les matchs et entraînements de vos sections</p>
              {canWrite && (
                <button 
                  disabled={!saisonActive}
                  onClick={() => setShowForm(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: saisonActive ? '#ed1f24' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saisonActive ? 'pointer' : 'not-allowed', fontFamily: 'Poppins, sans-serif' }}>
               Créer le premier événement
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {safeEvenements.map(evt => {
                const type   = TYPE_CONFIG[evt.type]   ?? TYPE_CONFIG.MATCH
                const statut = STATUT_CONFIG[evt.statut] ?? STATUT_CONFIG.PLANIFIE
                const date   = new Date(evt.date_heure)
                const resultat = evt.resultat ? RESULTAT_CONFIG[evt.resultat] : null
                const isVerrouille = evt.is_verrouille === true || evt.is_verrouille === 1

                return (
                  <div key={evt.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

                    {/* Date bloc */}
                    <div style={{ width: 52, flexShrink: 0, textAlign: 'center', background: type.bg, border: `1px solid ${type.border}`, borderRadius: 10, padding: '8px 4px' }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: type.color, lineHeight: 1 }}>{date.getDate()}</p>
                      <p style={{ fontSize: 10, color: type.color, fontWeight: 600, textTransform: 'uppercase' }}>{MOIS[date.getMonth()]?.slice(0, 3)}</p>
                      <p style={{ fontSize: 9, color: type.color, opacity: 0.7 }}>{date.getFullYear()}</p>
                    </div>

                    {/* Icône type */}
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{type.icon}</div>

                    {/* Infos principales */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                          {evt.type === 'ENTRAINEMENT'
                            ? `Entraînement — ${evt.section?.nom ?? ''}`
                            : evt.adversaire
                              ? `ENERGIE FC VS ${evt.adversaire}`
                              : evt.titre ?? 'Événement'
                          }
                        </h3>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: type.bg, color: type.color, border: `1px solid ${type.border}`, fontWeight: 600 }}>
                          {type.label}
                        </span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: statut.bg, color: statut.color, border: `1px solid ${statut.border}`, fontWeight: 600 }}>
                          {statut.label}
                        </span>
                        {resultat && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: resultat.bg, color: resultat.color, fontWeight: 700 }}>
                            {resultat.label}
                            {evt.score_nous != null && ` ${evt.score_nous}–${evt.score_adversaire ?? '?'}`}
                          </span>
                        )}
                        {isVerrouille && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#374151', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                             Clôturé
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {evt.lieu && (
                          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                             {evt.lieu}
                          </span>
                        )}
                        {evt.section && (
                          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                             {evt.section.nom}
                          </span>
                        )}
                        {evt.saison && (
                          <span style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                             {evt.saison.nom}
                          </span>
                        )}
                        {evt.nb_presents != null && (
                          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                             {evt.nb_presents} présent{evt.nb_presents > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      {isVerrouille && (
                        <div style={{ padding: '6px', color: '#ef4444', display: 'flex', alignItems: 'center' }} title="Événement clôturé et verrouillé">
                          <Lock size={16} />
                        </div>
                      )}

                      {/* Bouton de Clôture / Déclôture (Cadenas cliquable) */}
                      {canWrite && (
                        <button 
                          onClick={() => toggleVerrouillage(evt)}
                          style={{ 
                            padding: '6px 10px', 
                            border: '1px solid #e8e8e8', 
                            borderRadius: 7, 
                            background: isVerrouille ? '#fef2f2' : '#f0fdf4', 
                            cursor: 'pointer', 
                            color: isVerrouille ? '#ef4444' : '#15803d', 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}
                          title={isVerrouille ? "Déclôturer l'événement" : "Clôturer l'événement"}
                        >
                          <Lock size={14} style={{ opacity: isVerrouille ? 1 : 0.4 }} />
                        </button>
                      )}

                      {/* Bouton Voir détail */}
                      <button onClick={() => navigate(`/evenements/${evt.id}`)}
                        style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
                        title="Voir détail">
                        <Eye size={14} />
                      </button>

                      {/* Bouton Modifier */}
                      {canWrite && (
                        <button onClick={() => { setEditEvt(evt); setShowForm(true) }}
                          style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
                          title={isVerrouille ? "Consulter (Clôturé)" : "Modifier"}>
                          {isVerrouille ? <Eye size={14} /> : <Edit2 size={14} />}
                        </button>
                      )}

                      {/* Bouton Supprimer */}
                      {canWrite && !isVerrouille && (
                        <button onClick={() => setConfirmDel({ id: evt.id, nom: evt.adversaire ?? evt.titre ?? 'cet événement' })}
                          style={{ padding: '6px 10px', border: '1px solid #fecaca', borderRadius: 7, background: '#fef2f2', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                          title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.last > 1 && (
            <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Page {pagination.current} / {pagination.last}</p>
              <div style={{ display: 'flex', gap: 5 }}>
                <button disabled={pagination.current === 1} onClick={() => fetch(pagination.current - 1)}
                  style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', opacity: pagination.current === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(pagination.last, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetch(p)}
                    style={{ padding: '6px 11px', border: '1px solid #e8e8e8', borderRadius: 7, fontSize: 13, background: p === pagination.current ? '#ed1f24' : '#fff', color: p === pagination.current ? '#fff' : '#374151', borderColor: p === pagination.current ? '#ed1f24' : '#e8e8e8', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                    {p}
                  </button>
                ))}
                <button disabled={pagination.current === pagination.last} onClick={() => fetch(pagination.current + 1)}
                  style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', opacity: pagination.current === pagination.last ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      ) : (

        /* ══════════════════════════════════════
            VUE CALENDRIER MENSUEL
        ══════════════════════════════════════ */
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <button onClick={() => { if (calMois === 0) { setCalMois(11); setCalAnnee(y => y - 1) } else setCalMois(m => m - 1) }}
              style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              {MOIS[calMois]} {calAnnee}
            </h2>
            <button onClick={() => { if (calMois === 11) { setCalMois(0); setCalAnnee(y => y + 1) } else setCalMois(m => m + 1) }}
              style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {JOURS_COURTS.map(j => (
              <div key={j} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0' }}>
                {j}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {joursCalendrier().map((jour, idx) => {
              const evtsJour = jour ? getEvenementsJour(jour) : []
              const isAujourd = jour && new Date().getDate() === jour && new Date().getMonth() === calMois && new Date().getFullYear() === calAnnee
              const isWeekend = idx % 7 >= 5

              return (
                <div key={idx}
                  style={{
                    minHeight: 90, padding: '6px 8px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid #f0f0f0' : 'none',
                    borderBottom: '1px solid #f0f0f0',
                    background: isWeekend && jour ? '#fafafa' : '#fff',
                    cursor: jour && saisonActive ? 'pointer' : 'default',
                  }}
                  onClick={(ev) => {
                    if (jour && saisonActive) {
                      if (evtsJour.length > 0) {
                        setEditEvt(evtsJour[0])
                        setShowForm(true)
                      } else if (canWrite) {
                        const d = new Date(calAnnee, calMois, jour)
                        setDateSelectionnee(d.toISOString().split('T')[0])
                        setEditEvt(null)
                        setShowForm(true)
                      }
                    }
                  }}
                  onMouseEnter={e => { if (jour && saisonActive) e.currentTarget.style.background = '#f9f5f5' }}
                  onMouseLeave={e => { if (jour && saisonActive) e.currentTarget.style.background = isWeekend ? '#fafafa' : '#fff' }}
                >
                  {jour && (
                    <>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: isAujourd ? '#ed1f24' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 4,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: isAujourd ? 700 : 400, color: isAujourd ? '#fff' : '#1a1a1a' }}>{jour}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {evtsJour.slice(0, 3).map(e => {
                          const tc = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.MATCH
                          const locked = e.is_verrouille === true || e.is_verrouille === 1
                          return (
                            <div key={e.id}
                              onClick={(ev) => { 
                                ev.stopPropagation();
                                setEditEvt(e);
                                setShowForm(true);
                              }}
                              style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 500 }}>
                              {locked && '🔒 '}{tc.icon} {e.adversaire ? `ENERGIE FC VS ${e.adversaire}` : (e.titre ?? tc.label)}
                            </div>
                          )
                        })}
                        {evtsJour.length > 3 && (
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>+{evtsJour.length - 3} autres</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal Formulaire ── */}
      {showForm && (
        <ModalEvenementForm
          user={user}
          evenement={editEvt}
          dateDefaut={dateSelectionnee}
          sections={sections}
          saisonActive={saisonActive}
          competitions={competitions}
          onClose={() => { setShowForm(false); setEditEvt(null); setDateSelectionnee(null) }}
          onSaved={() => { fetch(pagination.current); setShowForm(false); setEditEvt(null) }}
        />
      )}

      {/* ── Confirm suppression ── */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background: '#fff', borderRadius: 14, maxWidth: 380, width: '100%', padding: '28px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={22} style={{ color: '#ef4444' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Supprimer cet événement ?</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Annuler</button>
              <button onClick={() => supprimerEvt(confirmDel.id)}
                style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Supprimer</button>
            </div>
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

// ── Formulaire d'Événement Modal ──
function ModalEvenementForm({ user, evenement, dateDefaut, sections, saisonActive, competitions = [], onClose, onSaved }) {
  const isEdit = !!evenement
  const isLocked = evenement?.is_verrouille === true || evenement?.is_verrouille === 1

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')

 const [form, setForm] = useState({
    type:           evenement?.type          ?? 'MATCH',
    titre:          evenement?.titre         ?? '',
    section_id:     evenement?.section_id    ? String(evenement.section_id) : (user?.role_systeme === 'RESPONSABLE_SECTION' || user?.role_systeme === 'COACH' ? String(user.section_id) : ''),
    saison_id:      evenement?.saison_id     ? String(evenement.saison_id) : (saisonActive?.id ? String(saisonActive.id) : ''),
    competition_id: evenement?.competition_id || '',
    adversaire:     evenement?.adversaire    ?? '',
    lieu:           evenement?.lieu          ?? '',
   domicile:       evenement?.domicile !== undefined ? (evenement.domicile === true || evenement.domicile === 'true' || evenement.domicile === 1 || evenement.domicile === '1') : true,
    date_heure:     evenement?.date_heure    ? evenement.date_heure.slice(0, 16) : (dateDefaut ? `${dateDefaut}T10:00` : ''),
    duree_minutes:  evenement?.duree_minutes ?? 90,
    statut:         evenement?.statut        ?? 'PLANIFIE',
    observations:   evenement?.observations  ?? '',
    resultat:       evenement?.resultat      ?? '',
    score_nous:     evenement?.score_nous    ?? '',
    score_adversaire: evenement?.score_adversaire ?? '',
    is_verrouille:  evenement?.is_verrouille ?? false,
  })

  const set = (e) => {
    if (isLocked) return
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setErrors(er => ({ ...er, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isLocked) return
console.log("VALEUR DU FORMULAIRE AVANT ENVOI (domicile) :", form.domicile);
    const errs = {}
    if (!form.saison_id) {
      errs.saison_id = 'Aucune saison active sélectionnée'
      setGlobalError("Impossible de créer un événement sans saison active.")
    }
    if (!form.section_id) errs.section_id = 'Section obligatoire'
    if (!form.date_heure) errs.date_heure = 'Date et heure obligatoires'
    if (form.type !== 'ENTRAINEMENT' && !form.adversaire) errs.adversaire = 'Adversaire obligatoire'
    
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true); setGlobalError('')
    try {
      const payload = {
        ...form,
        section_id:    parseInt(form.section_id),
        saison_id:     parseInt(form.saison_id),
        competition_id: form.competition_id ? parseInt(form.competition_id) : null,
        duree_minutes: parseInt(form.duree_minutes),
        score_nous:    form.score_nous    !== '' ? parseInt(form.score_nous)    : null,
        score_adversaire: form.score_adversaire !== '' ? parseInt(form.score_adversaire) : null,
        resultat:      form.resultat || null,
        adversaire:    form.type === 'ENTRAINEMENT' ? null : form.adversaire,
        is_verrouille: !!form.is_verrouille
      }
      if (isEdit) {
        await api.put(`/evenements/${evenement.id}`, payload)
      } else {
        await api.post('/evenements', payload)
      }
      onSaved()
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors ?? {})
      else setGlobalError(err.response?.data?.message ?? 'Erreur lors de l\'enregistrement.')
    } finally { setSaving(false) }
  }

  const isMatch = form.type !== 'ENTRAINEMENT'
  const safeSections = Array.isArray(sections) ? sections : []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, padding: '24px 28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease', margin: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              {isEdit ? (isLocked ? 'Consultation de l\'événement (Clôturé)' : 'Modifier l\'événement') : 'Nouvel Événement'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ed1f24', fontWeight: 600 }}>
              Rattaché à : {saisonActive?.nom ?? 'Aucune saison détectée'}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f5f5f5', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {globalError && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input type="hidden" name="saison_id" value={form.saison_id} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Type d'événement *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: `1px solid ${form.type === k ? v.border : '#e5e7eb'}`, borderRadius: 8, background: form.type === k ? v.bg : '#fafafa', cursor: isLocked ? 'not-allowed' : 'pointer', fontSize: 13, color: form.type === k ? v.color : '#6b7280', fontWeight: form.type === k ? 600 : 400, opacity: isLocked && form.type !== k ? 0.5 : 1 }}>
                    <input type="radio" name="type" value={k} checked={form.type === k} onChange={set} disabled={isLocked} style={{ display: 'none' }} />
                    {v.icon} {v.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: isMatch ? '1' : 'span 2' }}>
              <label style={lbl}>Section *</label>
              <select name="section_id" value={form.section_id} onChange={set}
                disabled={isLocked || user?.role_systeme === 'RESPONSABLE_SECTION' || user?.role_systeme === 'COACH'}
                style={{ ...inp, borderColor: errors.section_id ? '#ef4444' : '#e5e7eb', cursor: isLocked ? 'not-allowed' : 'default' }}>
                <option value="">Choisir une section</option>
                {safeSections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              {errors.section_id && <p style={err}>{errors.section_id}</p>}
            </div>

            {/* Champ Compétition (affiché uniquement s'il s'agit d'un MATCH ou facultatif) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              <label style={lbl}>Compétition</label>
              <select
                value={form.competition_id ?? ''}
                onChange={e => setForm({ ...form, competition_id: e.target.value || null })}
                style={inp}
                disabled={isLocked}
              >
                <option value="">-- Sélectionner la compétition --</option>
                {competitions.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.nom} ({comp.type})
                  </option>
                ))}
              </select>
            </div>

            {isMatch && (
              <div>
                <label style={lbl}>Adversaire *</label>
                <input name="adversaire" value={form.adversaire} onChange={set} disabled={isLocked}
                  placeholder="Nom de l'équipe adverse"
                  style={{ ...inp, borderColor: errors.adversaire ? '#ef4444' : '#e5e7eb', background: isLocked ? '#f3f4f6' : '#fafafa' }} />
                {errors.adversaire && <p style={err}>{errors.adversaire}</p>}
              </div>
            )}

            <div>
              <label style={lbl}>Date & Heure *</label>
              <input type="datetime-local" name="date_heure" value={form.date_heure} onChange={set} disabled={isLocked}
                style={{ ...inp, borderColor: errors.date_heure ? '#ef4444' : '#e5e7eb', background: isLocked ? '#f3f4f6' : '#fafafa' }} />
              {errors.date_heure && <p style={err}>{errors.date_heure}</p>}
            </div>

            <div>
              <label style={lbl}>Durée (minutes)</label>
              <input type="number" name="duree_minutes" value={form.duree_minutes} onChange={set} disabled={isLocked}
                min={15} max={300} style={{ ...inp, background: isLocked ? '#f3f4f6' : '#fafafa' }} />
            </div>

            <div>
              <label style={lbl}>Lieu</label>
              <input name="lieu" value={form.lieu} onChange={set} disabled={isLocked}
                placeholder="Stade, salle..." style={{ ...inp, background: isLocked ? '#f3f4f6' : '#fafafa' }} />
            </div>

            {isMatch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f0f0', opacity: isLocked ? 0.7 : 1 }}>
               <input 
  type="checkbox" 
  name="domicile" 
  checked={!!form.domicile} 
  disabled={isLocked}
  onChange={e => {
    console.log("CHANGEMENT DOMICILE - Valeur de e.target.checked :", e.target.checked);
    setForm(f => ({ ...f, domicile: e.target.checked }));
  }}
  style={{ width: 16, height: 16, accentColor: '#ed1f24', cursor: isLocked ? 'not-allowed' : 'pointer' }} 
/>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Match à domicile</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Décochez si match à l'extérieur</p>
                </div>
              </div>
            )}

            <div>
              <label style={lbl}>Statut</label>
              <select name="statut" value={form.statut} onChange={set} disabled={isLocked} style={{ ...inp, cursor: isLocked ? 'not-allowed' : 'default' }}>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {form.statut === 'TERMINE' && isMatch && (
              <>
                <div>
                  <label style={lbl}>Résultat</label>
                  <select name="resultat" value={form.resultat} onChange={set} disabled={isLocked} style={{ ...inp, cursor: isLocked ? 'not-allowed' : 'default' }}>
                    <option value="">Non renseigné</option>
                    <option value="VICTOIRE">Victoire</option>
                    <option value="DEFAITE">Défaite</option>
                    <option value="NUL">Nul</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Notre score</label>
                    <input type="number" name="score_nous" value={form.score_nous} onChange={set} disabled={isLocked}
                      min={0} placeholder="0" style={{ ...inp, background: isLocked ? '#f3f4f6' : '#fafafa' }} />
                  </div>
                  <div>
                    <label style={lbl}>Score adverse</label>
                    <input type="number" name="score_adversaire" value={form.score_adversaire} onChange={set} disabled={isLocked}
                      min={0} placeholder="0" style={{ ...inp, background: isLocked ? '#f3f4f6' : '#fafafa' }} />
                  </div>
                </div>
              </>
            )}

            {/* Zone des Observations */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Observations (optionnel)</label>
              <textarea
                name="observations"
                value={form.observations}
                rows={2}
                onChange={set}
                disabled={isLocked}
                placeholder="Notes, instructions pour le match..."
                style={{ ...inp, minHeight: 60, resize: 'vertical', background: isLocked ? '#f3f4f6' : '#fafafa' }}
              />
            </div>

            {/* 🏆 LE BLOC QUE VOUS AVEZ DONNÉ (Adapté et sécurisé pour React) */}
            {isEdit && evenement?.participations && evenement.participations.length > 0 && (
              <div style={{ gridColumn: 'span 2', marginTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={16} /> Liste des Joueurs & Primes
                </h4>
                
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', maxHeight: '250px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 14px', color: '#4b5563' }}>Joueur</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563' }}>Statut</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563' }}>Présence</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563' }}>Prime Calculée</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563' }}>Règlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evenement.participations.map((part) => (
                        <tr key={part.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          {/* Nom complet du joueur */}
                          <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                            {part.contrat?.personne ? `${part.contrat.personne.nom} ${part.contrat.personne.prenoms}` : 'N/A'}
                          </td>
                          
                          {/* Titulaire / Remplaçant */}
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, fontWeight: 600, background: part.is_titulaire ? '#eff6ff' : '#f3f4f6', color: part.is_titulaire ? '#2563eb' : '#4b5563' }}>
                              {part.is_titulaire ? 'Titulaire' : 'Remplaçant'}
                            </span>
                          </td>

                          {/* Présence */}
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ color: part.is_present ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                              {part.is_present ? 'Présent' : 'Absent'}
                            </span>
                          </td>

                          {/* Affichage des Primes calculées */}
                          <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#1f2937' }}>
                            {isLocked ? (
                              part.prime_calculee !== null ? (
                                <span style={{ color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: 6 }}>
                                  {new Intl.NumberFormat('fr-FR').format(part.prime_calculee)} FCFA
                                </span>
                              ) : (
                                <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Non générée</span>
                              )
                            ) : (
                              <span style={{ color: '#6b7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'normal' }}>
                                <Clock size={12} /> Attente clôture
                              </span>
                            )}
                          </td>

                          {/* Statut du Versement */}
                          <td style={{ padding: '10px 14px' }}>
                            {part.prime_versee ? (
                              <span style={{ color: '#2563eb', background: '#eff6ff', fontSize: 11, padding: '3px 8px', borderRadius: 12, fontWeight: 600 }}>
                                Versée
                              </span>
                            ) : (
                              <span style={{ color: '#d97706', background: '#fffbeb', fontSize: 11, padding: '3px 8px', borderRadius: 12, fontWeight: 600 }}>
                                À verser
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* 🏆 FIN DU BLOC */}

          </div> {/* Fin du conteneur grid */}

          {/* Boutons d'action tout en bas */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24, pt: 16, borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              {isLocked ? 'Fermer' : 'Annuler'}
            </button>

            {!isLocked ? (
              <button type="submit" disabled={saving || !form.saison_id}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', border: 'none', borderRadius: 8, background: form.saison_id ? '#ed1f24' : '#d1d5db', color: '#fff', fontSize: 13, fontWeight: 600, cursor: form.saison_id ? 'pointer' : 'not-allowed', fontFamily: 'Poppins, sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {isEdit ? 'Enregistrer' : 'Créer l\'événement'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#f3f4f6', color: '#6b7280', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #d1d5db' }}>
                <Lock size={13} /> Clôturé définitivement
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 5, display: 'block' }
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Poppins, sans-serif', background: '#fafafa', boxSizing: 'border-box' }
const err = { fontSize: 11, color: '#ef4444', marginTop: 2 }