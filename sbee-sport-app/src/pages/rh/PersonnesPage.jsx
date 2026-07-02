import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import {
  Search, UserPlus, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, XCircle, User, Phone,
  Eye, RefreshCw, FileText, Award, TrendingUp,
  Calendar, MapPin, Droplet, Ruler, Weight, CreditCard,
  X, Shield, Download, ExternalLink,
} from 'lucide-react'
import AddMemberForm from './AddMemberForm'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

const STATUT = {
  ACTIF:    { label: 'Actif',    bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  BLESSE:   { label: 'Blessé',   bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  SUSPENDU: { label: 'Suspendu', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  ARCHIVE:  { label: 'Archivé',  bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const ROLE_LABEL = {
  JOUEUR: 'Joueur', COACH: 'Coach',
  STAFF: 'Staff', MEDECIN: 'Médecin', INTENDANT: 'Intendant',
}

// Construit l'URL complète d'une photo
function photoUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}/storage/${path}`
}

// Avatar : photo ou initiales
function Avatar({ photoPath, nom, prenoms, size = 40, radius = 10 }) {
  const [err, setErr] = useState(false)
  const url = photoUrl(photoPath)
  const initiales = `${prenoms?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: '#fef2f2', border: '1.5px solid #fecaca',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#ed1f24',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {url && !err
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setErr(true)} />
        : initiales
      }
    </div>
  )
}

// Ouvre un document sécurisé (téléchargement via API avec token)
async function ouvrirDocument(docId, nomFichier) {
  try {
    const token = localStorage.getItem('sbee_token')
    const response = await fetch(
      `${API_BASE}/api/documents/${docId}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!response.ok) throw new Error('Erreur')
    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = nomFichier
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Impossible d\'ouvrir le document.')
  }
}

// ══════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════
export default function PersonnesPage() {
  const [membres, setMembres]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 })
  const [statsSection, setStatsSection] = useState([])

  const [showForm, setShowForm]         = useState(false)
  const [memberToEdit, setMemberToEdit] = useState(null)

  const [selectedId, setSelectedId]     = useState(null)
  const [ficheData, setFicheData]       = useState(null)
  const [ficheLoading, setFicheLoading] = useState(false)
  const [ficheTab, setFicheTab]         = useState('identite')
  const [selectedSectionId, setSelectedSectionId] = useState(null)

 const fetchMembres = useCallback(async (page = 1) => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/personnes', {
        params: { 
          page, 
          search: search || undefined, 
          type_role: roleFilter || undefined,
          section_id: selectedSectionId || undefined // <-- Ajout du paramètre ici
        },
      })
      setMembres(data.data ?? [])
      setPagination({
        current: data.current_page ?? 1,
        last:    data.last_page    ?? 1,
        total:   data.total        ?? 0,
      })
    } catch {
      setError('Impossible de charger les membres.')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, selectedSectionId]) // <-- Ajoute selectedSectionId ici

  const fetchStatsSections = useCallback(async () => {
    try {
      const { data } = await api.get('/sections')
      const sectionsRecues = data.sections ?? []
      const stats = sectionsRecues.map(sec => ({
        id: sec.id,
        nom: sec.nom,
        discipline: sec.discipline?.nom,
        count: sec.nb_membres ?? 0 
      }))
      setStatsSection(stats)
    } catch (e) {
      console.error("Impossible de charger les statistiques globales des sections", e)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchMembres(1)
      fetchStatsSections()
    }, 300)
    return () => clearTimeout(t)
  }, [fetchMembres, fetchStatsSections])
  const openFiche = async (id) => {
    setSelectedId(id)
    setFicheTab('identite')
    setFicheData(null)
    setFicheLoading(true)
    try {
      const { data } = await api.get(`/personnes/${id}`)
      setFicheData(data.personne)
    } catch {
      setFicheData(null)
    } finally {
      setFicheLoading(false)
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
            Effectif des Sections
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            {pagination.total} membre{pagination.total > 1 ? 's' : ''} enregistré{pagination.total > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
          Nouveau Membre
        </button>
      </div>

      {/* ── Stats par section ── */}
      {statsSection.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {statsSection.map(s => {
            const isSelected = selectedSectionId === s.id;
            return (
              <div 
                key={s.id} 
                onClick={() => {
                  // Si on reclique sur la section déjà sélectionnée, on désactive le filtre (null)
                  // Sinon, on applique l'ID de la section cliquée
                  setSelectedSectionId(isSelected ? null : s.id);
                }}
                style={{ 
                  padding: '10px 16px', 
                  background: isSelected ? '#fff5f5' : '#fff', 
                  border: isSelected ? '2px solid #ed1f24' : '1px solid #e8e8e8', 
                  borderRadius: 10, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  cursor: 'pointer', // Pour montrer que c'est cliquable au survol
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.02)' : 'none',
                  boxShadow: isSelected ? '0 4px 6px -1px rgba(237, 31, 36, 0.1)' : 'none'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ed1f24' }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{s.nom}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>{s.discipline} · <strong style={{ color: '#ed1f24' }}>{s.count}</strong> membre{s.count > 1 ? 's' : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filtres ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Rechercher par nom, prénom..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, fontFamily: 'Poppins, sans-serif', outline: 'none', background: '#fafafa' }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
  style={{ padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', outline: 'none' }}>
  <option value="">Tous les rôles</option>
  <option value="JOUEUR">Joueurs</option>
  <option value="COACH">Coachs</option>
  <option value="STAFF">Staff</option>
  <option value="MEDECIN">Médecins</option>
  <option value="INTENDANT">Intendants</option>
</select>

{/* 🔥 AJOUT : Bouton d'effacement du filtre de section */}
{selectedSectionId && (
  <button 
    onClick={() => setSelectedSectionId(null)}
    style={{ 
      padding: '8px 12px', 
      border: '1px solid #fecaca', 
      borderRadius: 8, 
      fontSize: 13, 
      background: '#fef2f2', 
      color: '#dc2626', 
      fontWeight: 500,
      cursor: 'pointer', 
      fontFamily: 'Poppins, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      transition: 'all 0.2s ease'
    }}
  >
    <span>Section filtrée</span>
    <span style={{ fontWeight: 700 }}>✕</span>
  </button>
)}

<button onClick={() => fetchMembres(pagination.current)}
  style={{ padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fafafa', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
  <RefreshCw size={14} />
</button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Tableau ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement...</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {['Photo & Nom', 'Section', 'Rôle & Poste', 'Documents', 'Statut', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {membres.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                      <User size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <p>Aucun membre trouvé</p>
                    </td></tr>
                  ) : membres.map(m => {
                    const contrat = m.contrats?.[0]
                    const statut  = STATUT[contrat?.statut] ?? STATUT.ARCHIVE
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f9f9f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        {/* Photo + Nom */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar photoPath={m.photo_url} nom={m.nom} prenoms={m.prenoms} size={40} radius={10} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{m.prenoms} {m.nom}</p>
                              {m.telephone && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{m.telephone}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Section */}
                        <td style={{ padding: '12px 16px' }}>
                          {contrat?.section ? (
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{contrat.section.nom}</p>
                              <p style={{ fontSize: 11, color: '#9ca3af' }}>{contrat.section.discipline?.nom}</p>
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>}
                        </td>

                        {/* Rôle */}
                        <td style={{ padding: '12px 16px' }}>
                          {contrat ? (
                            <div>
                              <p style={{ fontSize: 13, color: '#1a1a1a' }}>{ROLE_LABEL[contrat.type_role] ?? contrat.type_role}</p>
                              {contrat.poste_cle && <p style={{ fontSize: 11, color: '#ed1f24', fontWeight: 500 }}>{contrat.poste_cle}{contrat.numero_maillot ? ` · N°${contrat.numero_maillot}` : ''}</p>}
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>}
                        </td>

                        {/* Documents */}
                        <td style={{ padding: '12px 16px' }}>
                          {contrat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {contrat.documents_valides
                                ? <><span style={{ fontSize: 12, color: '#059669' }}>Complets</span></>
                                : <><span style={{ fontSize: 12, color: '#ef4444' }}>Incomplets</span></>}
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>}
                        </td>

                        {/* Statut */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: statut.bg, color: statut.color, border: `1px solid ${statut.border}` }}>
                            {statut.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => openFiche(m.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ed1f24'; e.currentTarget.style.borderColor = '#fecaca' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#e8e8e8' }}>
                             Voir la fiche
                          </button>
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
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Page {pagination.current} / {pagination.last} · {pagination.total} membres</p>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button disabled={pagination.current === 1} onClick={() => fetchMembres(pagination.current - 1)}
                    style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', opacity: pagination.current === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(pagination.last, 5) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => fetchMembres(p)}
                      style={{ padding: '6px 11px', border: '1px solid #e8e8e8', borderRadius: 7, fontSize: 13, background: p === pagination.current ? '#ed1f24' : '#fff', color: p === pagination.current ? '#fff' : '#374151', borderColor: p === pagination.current ? '#ed1f24' : '#e8e8e8', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                      {p}
                    </button>
                  ))}
                  <button disabled={pagination.current === pagination.last} onClick={() => fetchMembres(pagination.current + 1)}
                    style={{ padding: '6px 10px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer', opacity: pagination.current === pagination.last ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════
          MODAL FICHE COMPLÈTE
      ══════════════════════════════════════ */}
      {selectedId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setSelectedId(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}
            onClick={e => e.stopPropagation()}>

            {ficheLoading ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement de la fiche...</p>
              </div>
            ) : ficheData ? (
              <>
                {/* ── Header fiche ── */}
                <div style={{ padding: '22px 28px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <Avatar photoPath={ficheData.photo_url} nom={ficheData.nom} prenoms={ficheData.prenoms} size={64} radius={14} />
                      <div>
                        <h2 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 19, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                          {ficheData.prenoms} {ficheData.nom}
                        </h2>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                          {ficheData.contrats?.[0] && (
                            <>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{ROLE_LABEL[ficheData.contrats[0].type_role]}</span>
                              <span style={{ color: '#ddd' }}>·</span>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{ficheData.contrats[0].section?.nom}</span>
                              {ficheData.contrats[0].poste_cle && (
                                <><span style={{ color: '#ddd' }}>·</span>
                                <span style={{ fontSize: 12, color: '#ed1f24', fontWeight: 600 }}>{ficheData.contrats[0].poste_cle}</span></>
                              )}
                              {ficheData.contrats[0].numero_maillot && (
                                <span style={{ fontSize: 11, padding: '1px 7px', background: '#fef2f2', color: '#ed1f24', borderRadius: 99, fontWeight: 700 }}>
                                  N°{ficheData.contrats[0].numero_maillot}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedId(null)}
                      style={{ border: 'none', background: '#f5f5f5', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
                      <X size={16} />
                    </button>
                  </div>

                  {/* Onglets */}
                  <div style={{ display: 'flex' }}>
                    {[
                      { key: 'identite', label: 'Identité' },
                      { key: 'contrat',  label: 'Contrat' },
                      { key: 'documents',label: 'Documents' },
                      { key: 'primes',   label: 'Primes' },
                      { key: 'palmares', label: 'Palmarès' },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setFicheTab(tab.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '10px 14px', border: 'none', background: 'none',
                          fontSize: 13, fontWeight: ficheTab === tab.key ? 600 : 400,
                          color: ficheTab === tab.key ? '#ed1f24' : '#6b7280',
                          borderBottom: `2px solid ${ficheTab === tab.key ? '#ed1f24' : 'transparent'}`,
                          cursor: 'pointer', fontFamily: 'Poppins, sans-serif', marginBottom: -1,
                        }}>
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Contenu onglets ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

                  {/* ─── IDENTITÉ ─── */}
                  {ficheTab === 'identite' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Sexe',           value: ficheData.sexe === 'M' ? ' Masculin' : ficheData.sexe === 'F' ? ' Féminin' : '—' },
                          { label: 'Date naissance', value: ficheData.date_naissance ? new Date(ficheData.date_naissance).toLocaleDateString('fr-FR') : '—' },
                          { label: 'Lieu naissance', value: ficheData.lieu_naissance || '—' },
                          { label: 'Nationalité',    value: ficheData.nationalite || '—' },
                          { label: 'Numéro CNI',     value: ficheData.cni_numero || '—' },
                          { label: 'Téléphone',      value: ficheData.telephone || '—' },
                          { label: 'Groupe sanguin', value: ficheData.groupe_sanguin || '—' },
                          { label: 'N° Licence',     value: ficheData.contrats?.[0]?.numero_licence || '—' },
                          { label: 'Taille',         value: ficheData.taille_cm ? `${ficheData.taille_cm} cm` : '—' },
                          { label: 'Poids',          value: ficheData.poids_kg ? `${ficheData.poids_kg} kg` : '—' },
                        ].map(({ label, value }) => (
                          <InfoCard key={label} label={label} value={value} />
                        ))}
                      </div>

                      {ficheData.adresse && (
                        <div style={{ marginTop: 10, padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                          <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
                            <MapPin size={10} style={{ display: 'inline', marginRight: 4 }} />Adresse
                          </p>
                          <p style={{ fontSize: 13, color: '#1a1a1a' }}>{ficheData.adresse}</p>
                        </div>
                      )}

                      {ficheData.allergies && (
                        <div style={{ marginTop: 10, padding: '12px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                          <p style={{ fontSize: 10, color: '#d97706', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}> Allergies</p>
                          <p style={{ fontSize: 13, color: '#92400e' }}>{ficheData.allergies}</p>
                        </div>
                      )}

                      {ficheData.antecedents_medicaux && (
                        <div style={{ marginTop: 10, padding: '12px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                          <p style={{ fontSize: 10, color: '#dc2626', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}> Antécédents médicaux</p>
                          <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>{ficheData.antecedents_medicaux}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── CONTRAT ─── */}
                  {ficheTab === 'contrat' && (
                    <div>
                      {ficheData.contrats?.length > 0 ? ficheData.contrats.map(c => (
                        <div key={c.id} style={{ border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{c.section?.nom}</p>
                              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                                {c.section?.discipline?.nom} · Saison {c.saison?.nom}
                              </p>
                            </div>
                            <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: STATUT[c.statut]?.bg ?? '#f9fafb', color: STATUT[c.statut]?.color ?? '#6b7280', border: `1px solid ${STATUT[c.statut]?.border ?? '#e5e7eb'}` }}>
                              {STATUT[c.statut]?.label ?? c.statut}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                              { label: 'Rôle',             value: ROLE_LABEL[c.type_role] ?? c.type_role },
                              { label: 'Poste',            value: c.poste_cle || '—' },
                              { label: 'N° Maillot',       value: c.numero_maillot ? `N°${c.numero_maillot}` : '—' },
                              { label: 'N° Licence',       value: c.numero_licence || '—' },
                              { label: 'Salaire fixe',     value: c.salaire_fixe > 0 ? `${Number(c.salaire_fixe).toLocaleString('fr-FR')} FCFA` : 'Primes uniquement' },
                              { label: 'Prime signature',  value: c.prime_signature > 0 ? `${Number(c.prime_signature).toLocaleString('fr-FR')} FCFA` : '—' },
                              { label: 'Mode paiement',    value: c.mode_paiement || '—' },
                              { label: 'N° Assurance',   value:c.assurance_ref || '—' },
                              { label: 'Début contrat',    value: c.date_debut_contrat ? new Date(c.date_debut_contrat).toLocaleDateString('fr-FR') : '—' },
                              { label: 'Fin contrat',      value: c.date_fin_contrat ? new Date(c.date_fin_contrat).toLocaleDateString('fr-FR') : '—' },
                            ].map(({ label, value }) => (
                              <InfoCard key={label} label={label} value={value} />
                            ))}
                          </div>

                          {/* Badges validations */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                            <div style={{ padding: '9px 12px', background: c.documents_valides ? '#f0fdf4' : '#fef2f2', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${c.documents_valides ? '#bbf7d0' : '#fecaca'}` }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: c.documents_valides ? '#059669' : '#ef4444' }}>
                                Documents {c.documents_valides ? 'complets' : 'incomplets'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 32 }}>Aucun contrat trouvé</p>
                      )}
                    </div>
                  )}

                  {/* ─── DOCUMENTS ─── */}
                  {ficheTab === 'documents' && (
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                        Cliquez sur un document pour le télécharger.
                      </p>
                      {ficheData.documents?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {ficheData.documents.filter(d => d.is_valide).map(doc => (
                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e8e8e8', borderRadius: 10, background: '#fafafa' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <FileText size={18} style={{ color: '#ed1f24' }} />
                                </div>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{doc.type_document.replace(/_/g, ' ')}</p>
                                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                    {doc.nom_fichier}
                                    {doc.date_expiration && ` · Expire le ${new Date(doc.date_expiration).toLocaleDateString('fr-FR')}`}
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => ouvrirDocument(doc.id, doc.nom_fichier)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ed1f24'; e.currentTarget.style.borderColor = '#fecaca' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#e8e8e8' }}>
                                  <Download size={13} /> Télécharger
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                          <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucun document enregistré</p>
                          <p style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Les documents doivent être uploadés lors de la création ou de la modification du membre</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── PRIMES ─── */}
                  {ficheTab === 'primes' && <PrimesTab personneId={ficheData.id} />}

                  {/* ─── PALMARÈS ─── */}
                  {ficheTab === 'palmares' && (
                    <div>
                      {ficheData.palmares?.length > 0 ? ficheData.palmares.map(p => (
                        <div key={p.id} style={{ display: 'flex', gap: 14, padding: '14px 16px', border: '1px solid #e8e8e8', borderRadius: 10, marginBottom: 8, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Award size={18} style={{ color: '#d97706' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{p.titre}</p>
                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                              {p.annee}{p.club_organisation ? ` · ${p.club_organisation}` : ''}
                            </p>
                          </div>
                        </div>
                      )) : (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <Award size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                          <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucune distinction enregistrée</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
               {/* Footer */}
<div style={{ padding: '14px 28px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
  <button onClick={() => setSelectedId(null)}
    style={{ padding: '9px 20px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
    Fermer
  </button>
 <button 
  onClick={() => {
    setMemberToEdit(ficheData); // On charge les données
    setShowForm(true);   
    setSelectedId(null);       // <-- C'ÉTAIT ICI L'ERREUR, il faut setShowForm
  }}
  style={{ 
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', 
    background: '#f3f4f6', border: 'none', borderRadius: 6, 
    fontSize: 12, fontWeight: 600, cursor: 'pointer' 
  }}
>
   Modifier la fiche
</button>
</div>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <AlertCircle size={24} style={{ margin: '0 auto 12px' }} />
                <p>Erreur de chargement de la fiche</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Formulaire */}
      {/* Modal Formulaire (en bas de ton fichier) */}
{showForm && (
  <div 
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    onClick={() => {
        setShowForm(false);
        setMemberToEdit(null); 
        
    }}
  >
    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 660 }}>
      <AddMemberForm 
        member={memberToEdit} 
        onOpenChange={(val) => {
            setShowForm(val);
            if(!val) setMemberToEdit(null);
        }} 
        onMemberAdded={async () => { 
            // On utilise un try/catch ici aussi pour éviter que le rafraîchissement bloque la fermeture
            try {
                await fetchMembres(pagination.current); 
                if (selectedId && typeof fetchFiche === 'function') {
                    await fetchFiche(selectedId); 
                }
            } catch (e) {
                console.log("Erreur lors du rafraîchissement des données", e);
            }
            
            // QUOI QU'IL ARRIVE, ON FERME LE FORMULAIRE
            setShowForm(false);
            setMemberToEdit(null);
        }} 
      />
    </div>
  </div>
)}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

// ── Carte info réutilisable ──
function InfoCard({ label, value }) {
  return (
    <div style={{ padding: '11px 13px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f0f0' }}>
      <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: value && value !== '—' ? '#1a1a1a' : '#d1d5db' }}>{value || '—'}</p>
    </div>
  )
}

// ── Onglet Primes ──
function PrimesTab({ personneId }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get(`/personnes/${personneId}/historique-primes`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [personneId])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Loader2 size={24} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
    </div>
  )

  const participations = data?.participations ?? []
  const total = data?.total_primes ?? 0

  if (participations.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <TrendingUp size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
      <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucune prime enregistrée</p>
    </div>
  )

  return (
    <div>
      {/* Total */}
      <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>Total des primes perçues</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
          {Number(total).toLocaleString('fr-FR')} FCFA
        </span>
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {participations.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                {p.evenement?.type === 'ENTRAINEMENT'
                  ? 'Entraînement'
                  : p.evenement?.adversaire ? `vs ${p.evenement.adversaire}` : 'Match'}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {p.is_titulaire ? 'Titulaire' : 'Remplaçant'}
                {p.evenement?.resultat && ` · ${p.evenement.resultat}`}
                {p.evenement?.date_heure && ` · ${new Date(p.evenement.date_heure).toLocaleDateString('fr-FR')}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#ed1f24' }}>
                +{Number(p.prime_calculee).toLocaleString('fr-FR')} F
              </p>
              <p style={{ fontSize: 10, color: p.prime_versee ? '#059669' : '#f59e0b', fontWeight: 500 }}>
                {p.prime_versee ? '✓ Versée' : '⏳ En attente'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}