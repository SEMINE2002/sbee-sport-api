import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import {
  Plus, Edit2, Trash2, ChevronRight,
  Users, Trophy, Loader2, AlertCircle, X, Save,
  Dumbbell, RefreshCw, Shield, Upload, Image as ImageIcon
} from 'lucide-react'

// ── Icônes par sport (Fallback si aucune photo n'est uploadée) ──
const SPORT_ICONS = {
  Football:   '⚽',
  Basketball: '🏀',
  Handball:   '🤾',
  Volleyball: '🏐',
  Tennis:     '🎾',
  Natation:   '🏊',
  Athlétisme: '🏃',
}

const SPORT_COLORS = {
  Football:   { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', accent: '#3b82f6' },
  Basketball: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', accent: '#f97316' },
  Handball:   { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', accent: '#22c55e' },
  Volleyball: { bg: '#faf5ff', border: '#e9d5ff', color: '#7e22ce', accent: '#a855f7' },
  default:    { bg: '#fbfbfa', border: '#e4e4e7', color: '#27272a', accent: '#71717a' },
}

function getColors(nom) {
  return SPORT_COLORS[nom] ?? SPORT_COLORS.default
}

export default function DisciplineSectionManager() {
  const [disciplines, setDisciplines] = useState([])
  const [loading, setLoading]         = useState(true)
  const [globalError, setGlobalError] = useState(null)
  const [expanded, setExpanded]       = useState({}) 

  // États pour la visualisation des membres d'une section
  const [selectedSection, setSelectedSection] = useState(null)
  const [loadingMembres, setLoadingMembres]   = useState(false)

  // Modals
  const [modalDisc, setModalDisc]   = useState(null) 
  const [modalSec, setModalSec]     = useState(null) 
  const [confirmDel, setConfirmDel] = useState(null) 

  // Erreurs de validation d'API
  const [errorsDisc, setErrorsDisc] = useState({})
  const [errorsSec, setErrorsSec]   = useState({})
  const [saving, setSaving]         = useState(false)

  // Aperçu temporaire de l'image sélectionnée dans le modal
  const [imagePreview, setImagePreview] = useState(null)

  // ── États des formulaires alignés sur la Base de Données ──
  const [formDisc, setFormDisc] = useState({
    nom: '',
    code: '',
    type: 'COLLECTIF',
    icone_file: null, 
    instance_mondiale: '',
    nb_joueurs_terrain: '',
    duree_match_minutes: ''
  })

  const [formSec, setFormSec] = useState({
    nom: '',
    code_analytique: '',
    genre: 'M',
    is_active: 1
  })

  // ── Chargement des données ──
  const load = useCallback(async () => {
    setLoading(true); setGlobalError(null)
    try {
      const { data } = await api.get('/disciplines')
      const list = data.disciplines ?? data.data ?? data
      
      const withSections = await Promise.all(
        list.map(async d => {
          try {
            const res = await api.get('/sections', { params: { discipline_id: d.id } })
            return { ...d, sections: res.data.sections ?? res.data.data ?? [] }
          } catch {
            return { ...d, sections: [] }
          }
        })
      )
      setDisciplines(withSections)
    } catch (err) {
      setGlobalError(err.response?.data?.message ?? 'Impossible de charger les disciplines.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Chargement des membres au clic sur une section
  const handleSelectSection = async (sectionId) => {
    if (selectedSection && selectedSection.id === sectionId) {
      setSelectedSection(null)
      return
    }
    setLoadingMembres(true)
    try {
      const { data } = await api.get(`/sections/${sectionId}`)
      setSelectedSection(data.section ?? data.data ?? data)
    } catch (err) {
      alert('Impossible de charger les membres de cette section.')
    } finally {
      setLoadingMembres(false)
    }
  }

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  // Gestion du choix de fichier photo
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormDisc(f => ({ ...f, icone_file: file }))
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // ── Actions Discipline ──
  function openCreateDisc() {
    setFormDisc({ nom: '', code: '', type: 'COLLECTIF', icone_file: null, instance_mondiale: '', nb_joueurs_terrain: '', duree_match_minutes: '' })
    setImagePreview(null)
    setErrorsDisc({})
    setModalDisc('create')
  }

  function openEditDisc(disc) {
    setFormDisc({
      nom: disc.nom,
      code: disc.code ?? '',
      type: disc.type ?? 'COLLECTIF',
      icone_file: null, 
      instance_mondiale: disc.instance_mondiale ?? '',
      nb_joueurs_terrain: disc.nb_joueurs_terrain ?? '',
      duree_match_minutes: disc.duree_match_minutes ?? ''
    })
    setImagePreview(disc.icone_url ? (disc.icone_url.startsWith('http') ? disc.icone_url : `http://localhost:8000/storage/${disc.icone_url}`) : null)
    setErrorsDisc({})
    setModalDisc(disc)
  }

  async function saveDisc(e) {
    e.preventDefault()
    if (!formDisc.nom.trim()) { setErrorsDisc({ nom: 'Le nom est obligatoire' }); return }
    setSaving(true); setErrorsDisc({})

    const formData = new FormData()
    formData.append('nom', formDisc.nom)
    formData.append('code', formDisc.code)
    formData.append('type', formDisc.type)
    formData.append('instance_mondiale', formDisc.instance_mondiale)
    formData.append('nb_joueurs_terrain', formDisc.nb_joueurs_terrain)
    formData.append('duree_match_minutes', formDisc.duree_match_minutes)
    
    if (formDisc.icone_file) {
      formData.append('icone_file', formDisc.icone_file) 
    }

    try {
      if (modalDisc === 'create') {
        await api.post('/disciplines', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        formData.append('_method', 'PUT')
        await api.post(`/disciplines/${modalDisc.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      setModalDisc(null)
      load()
    } catch (err) {
      if (err.response?.status === 422) setErrorsDisc(err.response.data.errors ?? {})
      else setErrorsDisc({ nom: err.response?.data?.message ?? 'Erreur serveur' })
    } finally { setSaving(false) }
  }

  async function deleteDisc(id) {
    setSaving(true)
    try {
      await api.delete(`/disciplines/${id}`)
      setConfirmDel(null)
      load()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Impossible de supprimer.')
    } finally { setSaving(false) }
  }

  // ── Actions Section ──
  function openCreateSec(disc) {
    setFormSec({ nom: '', code_analytique: '', genre: 'M', is_active: 1 })
    setErrorsSec({})
    setModalSec({ discipline: disc, section: null })
  }

  function openEditSec(disc, sec) {
    setFormSec({
      nom: sec.nom,
      code_analytique: sec.code_analytique ?? '',
      genre: sec.genre ?? 'M',
      is_active: sec.is_active ?? 1
    })
    setErrorsSec({})
    setModalSec({ discipline: disc, section: sec })
  }

  async function saveSec(e) {
    e.preventDefault()
    if (!formSec.nom.trim()) { setErrorsSec({ nom: 'Le nom est obligatoire' }); return }
    setSaving(true); setErrorsSec({})
    try {
      const payload = { ...formSec, discipline_id: modalSec.discipline.id }
      if (!modalSec.section) {
        await api.post('/sections', payload)
      } else {
        await api.put(`/sections/${modalSec.section.id}`, payload)
      }
      setModalSec(null)
      load()
    } catch (err) {
      if (err.response?.status === 422) setErrorsSec(err.response.data.errors ?? {})
      else setErrorsSec({ nom: err.response?.data?.message ?? 'Erreur serveur' })
    } finally { setSaving(false) }
  }

  async function deleteSec(id) {
    setSaving(true)
    try {
      await api.delete(`/sections/${id}`)
      setConfirmDel(null)
      load()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Impossible de supprimer.')
    } finally { setSaving(false) }
  }

  const totalSections = disciplines.reduce((acc, d) => acc + (d.sections?.length ?? 0), 0)
  const totalMembres  = disciplines.reduce((acc, d) =>
    acc + (d.sections?.reduce((a, s) => a + (s.nb_membres ?? 0), 0) ?? 0), 0)

  const inputStyle = { padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa' }
  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
  const modalContent = { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: '24px 28px', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.2)' }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Disciplines &amp; Sections</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            {disciplines.length} discipline{disciplines.length > 1 ? 's' : ''} · {totalSections} section{totalSections > 1 ? 's' : ''} · {totalMembres} membre{totalMembres > 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={openCreateDisc} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Nouvelle Discipline
          </button>
        </div>
      </div>

      {globalError && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {globalError}
        </div>
      )}

      {/* ── Liste des disciplines ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: '#ed1f24', margin: '0 auto' }} />
          <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement...</p>
        </div>
      ) : disciplines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <Dumbbell size={40} style={{ margin: '0 auto 16px', color: '#d1d5db' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Aucune discipline créée</p>
          <button onClick={openCreateDisc} style={{ padding: '10px 20px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Créer la première discipline
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disciplines.map(disc => {
            const colors  = getColors(disc.nom)
            
            const icon = disc.icone_url ? (
              <img src={disc.icone_url.startsWith('http') ? disc.icone_url : `http://localhost:8000/storage/${disc.icone_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
            ) : (SPORT_ICONS[disc.nom] ?? '🏅')

            const isOpen  = expanded[disc.id] ?? true
            const nbSecs  = disc.sections?.length ?? 0
            const nbMbres = disc.sections?.reduce((a, s) => a + (s.nb_membres ?? 0), 0) ?? 0

            return (
              <div key={disc.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                
                {/* En-tête discipline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggle(disc.id)}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, overflow: 'hidden' }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{disc.nom}</h2>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`, fontWeight: 700 }}>{disc.code}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: disc.type === 'INDIVIDUEL' ? '#fef3c7' : '#e0f2fe', color: disc.type === 'INDIVIDUEL' ? '#b45309' : '#0369a1', fontWeight: 700 }}>{disc.type}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
                      <strong style={{ color: colors.color }}>{nbSecs}</strong> sections · <strong style={{ color: colors.color }}>{nbMbres}</strong> membres 
                      {disc.instance_mondiale && ` · Féd: ${disc.instance_mondiale}`}
                      {disc.nb_joueurs_terrain && ` · ${disc.nb_joueurs_terrain} Joueurs`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openCreateSec(disc)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, fontSize: 12, color: colors.color, cursor: 'pointer', fontWeight: 500 }}>
                       Section
                    </button>
                    <button onClick={() => openEditDisc(disc)} style={{ padding: '6px 8px', border: '1px solid #e8e8e8', borderRadius: 7, background: '#fff', cursor: 'pointer' }}><Edit2 size={13} /></button>
                    <button onClick={() => setConfirmDel({ type: 'disc', id: disc.id, nom: disc.nom })} style={{ padding: '6px 8px', border: '1px solid #fecaca', borderRadius: 7, background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                  </div>
                  <ChevronRight size={18} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#9ca3af' }} />
                </div>

                {/* ── Bloc des Sections ── */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0' }}>
                    {disc.sections?.length === 0 ? (
                      <div style={{ padding: '20px 24px', textAlign: 'center' }}>
                        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>Aucune section dans cette discipline</p>
                        <button onClick={() => openCreateSec(disc)} style={{ padding: '7px 14px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, fontSize: 12, color: colors.color, cursor: 'pointer' }}>Créer la première section</button>
                      </div>
                    ) : (
                      <div style={{ padding: '10px 16px 14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                          {disc.sections.map(sec => (
                            <SectionCard
                              key={sec.id}
                              section={sec}
                              colors={colors}
                              isSelected={selectedSection?.id === sec.id}
                              onClick={() => handleSelectSection(sec.id)}
                              onEdit={() => openEditSec(disc, sec)}
                              onDelete={() => setConfirmDel({ type: 'sec', id: sec.id, nom: sec.nom })}
                            />
                          ))}
                        </div>

                        {/* Liste des membres actifs au clic */}
                        {selectedSection && disc.sections.some(s => s.id === selectedSection.id) && (
                          <div style={{ marginTop: 16, background: '#fafafa', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                              <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                Membres Actifs — {selectedSection.nom} ({selectedSection.contrats?.length ?? 0})
                              </h3>
                              <button onClick={() => setSelectedSection(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={16} /></button>
                            </div>

                            {loadingMembres ? (
                              <div style={{ padding: 20, textAlign: 'center' }}>
                                <Loader2 size={18} className="animate-spin" style={{ color: colors.color, margin: '0 auto' }} />
                              </div>
                            ) : !selectedSection.contrats || selectedSection.contrats.length === 0 ? (
                              <p style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Aucun membre trouvé ou actif dans cette section.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                                {selectedSection.contrats.map(contrat => (
                                  <div key={contrat.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.bg, color: colors.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                                      {contrat.personne?.prenoms?.[0] ?? ''}{contrat.personne?.nom?.[0] ?? ''}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {contrat.personne?.prenoms} {contrat.personne?.nom}
                                      </p>
                                      <p style={{ fontSize: 11, color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {contrat.type_role === 'JOUEUR' ? null : null}
                                        {contrat.type_role}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL Discipline ── */}
      {modalDisc && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{modalDisc === 'create' ? 'Nouvelle Discipline' : `Modifier Discipline`}</h2>
              <button onClick={() => setModalDisc(null)} style={{ border: 'none', background: '#f5f5f5', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer' }}></button>
            </div>
            <form onSubmit={saveDisc}>
              
              {/* Zone d'upload de Photo avec aperçu dynamique */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20, background: '#f9fafb', padding: 16, borderRadius: 12, border: '1px dashed #d1d5db' }}>
                <div style={{ width: 70, height: 70, borderRadius: 14, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 32 }}>
                  {imagePreview ? <img src={imagePreview} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={28} style={{ color: '#9ca3af' }} />}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4b5563', background: '#fff', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <Upload size={14} /> Choisir la photo du sport
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
                {errorsDisc.icone_file && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorsDisc.icone_file[0]}</p>}
              </div>

              <Field label="Nom de la discipline *" error={errorsDisc.nom}>
                <input value={formDisc.nom} onChange={e => setFormDisc(f => ({ ...f, nom: e.target.value }))} placeholder="Football, Basketball..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <Field label="Code court *" error={errorsDisc.code}>
                  <input value={formDisc.code} onChange={e => setFormDisc(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="FOOT, BASK..." maxLength={10} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </Field>
                <Field label="Type *" error={errorsDisc.type}>
                  <select value={formDisc.type} onChange={e => setFormDisc(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', background: '#fff', height: 38 }}>
                    <option value="COLLECTIF">Collective</option>
                    <option value="INDIVIDUEL">Individuelle</option>
                  </select>
                </Field>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Field label="Instance mondiale / Fédération" error={errorsDisc.instance_mondiale}>
                  <input value={formDisc.instance_mondiale} onChange={e => setFormDisc(f => ({ ...f, instance_mondiale: e.target.value }))} placeholder="FIFA, FIBA, IHF..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <Field label="Joueurs sur le terrain" error={errorsDisc.nb_joueurs_terrain}>
                  <input type="number" value={formDisc.nb_joueurs_terrain} onChange={e => setFormDisc(f => ({ ...f, nb_joueurs_terrain: e.target.value }))} placeholder="11, 5, 7..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </Field>
                <Field label="Durée match (Minutes)" error={errorsDisc.duree_match_minutes}>
                  <input type="number" value={formDisc.duree_match_minutes} onChange={e => setFormDisc(f => ({ ...f, duree_match_minutes: e.target.value }))} placeholder="90, 40, 60..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setModalDisc(null)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null} Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL Section ── */}
      {modalSec && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{!modalSec.section ? `Nouvelle section — ${modalSec.discipline.nom}` : `Modifier section`}</h2>
              <button onClick={() => setModalSec(null)} style={{ border: 'none', background: '#f5f5f5', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <form onSubmit={saveSec}>
              <Field label="Nom de la section *" error={errorsSec.nom}>
                <input value={formSec.nom} onChange={e => setFormSec(f => ({ ...f, nom: e.target.value }))} placeholder="Équipe Senior A, Cadets..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <Field label="Code analytique" error={errorsSec.code_analytique}>
                  <input value={formSec.code_analytique} onChange={e => setFormSec(f => ({ ...f, code_analytique: e.target.value.toUpperCase() }))} placeholder="ex: FOOT-SEN-M" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </Field>
                <Field label="Genre *" error={errorsSec.genre}>
                  <select value={formSec.genre} onChange={e => setFormSec(f => ({ ...f, genre: e.target.value }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', background: '#fff', height: 38 }}>
                    <option value="M"> Masculin (M)</option>
                    <option value="F"> Féminin (F)</option>
                    <option value="MIXTE"> Mixte (MIXTE)</option>
                  </select>
                </Field>
              </div>
              <Field label="Statut de la section (Actif)">
                <select value={formSec.is_active} onChange={e => setFormSec(f => ({ ...f, is_active: parseInt(e.target.value) }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', background: '#fff', height: 38 }}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive / Suspendue</option>
                </select>
              </Field>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setModalSec(null)} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null} Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL Suppression ── */}
      {confirmDel && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Trash2 size={22} style={{ color: '#ef4444' }} /></div>
              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 6px 0' }}>Supprimer <strong>"{confirmDel.nom}"</strong> ?</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cette action est irréversible dans le système.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => confirmDel.type === 'disc' ? deleteDisc(confirmDel.id) : deleteSec(confirmDel.id)} disabled={saving} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, error, children }) {
  const msg = Array.isArray(error) ? error[0] : error
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563' }}>{label}</label>
      {children}
      {msg && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0 0' }}>{msg}</p>}
    </div>
  )
}

function SectionCard({ section, colors, isSelected, onClick, onEdit, onDelete }) {
  return (
    <div onClick={onClick} style={{ border: isSelected ? `2px solid ${colors.color}` : `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 16px', background: colors.bg, position: 'relative', cursor: 'pointer', opacity: section.is_active ? 1 : 0.6 }}>
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} style={{ padding: '4px 6px', border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.7)', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={11} /></button>
        <button onClick={onDelete} style={{ padding: '4px 6px', border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.7)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={11} /></button>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: colors.color, margin: '0 0 4px 0', paddingRight: 50 }}>{section.nom}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, marginTop: 4 }}>
        {section.code_analytique && <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: colors.color, padding: '2px 6px', borderRadius: 4 }}>{section.code_analytique}</span>}
        <span style={{ fontSize: 10, fontWeight: 600, background: '#f4f4f5', color: '#52525b', padding: '2px 6px', borderRadius: 4 }}> {section.genre}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.color }}>{section.nb_membres ?? 0} membre{(section.nb_membres ?? 0) > 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}