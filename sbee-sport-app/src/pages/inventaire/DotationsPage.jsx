import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import { 
  UserCheck, History, Calendar, CheckCircle, AlertTriangle, 
  Plus, Loader2, X, Search, ChevronLeft, ChevronRight, Info, HelpCircle
} from 'lucide-react'

const STATUT_CONFIG = {
  EN_COURS: { bg: '#fff7ed', text: '#ea580c', label: 'En possession (À rendre)' },
  RENDU: { bg: '#f0fdf4', text: '#16a34a', label: 'Rendu / Restitué' },
  PERDU_PAYE: { bg: '#f0fdf4', text: '#15803d', label: 'Perdu (Remboursé)' },
  PERDU_NON_PAYE: { bg: '#fef2f2', text: '#b91c1c', label: 'Perdu (Non remboursé)' }
}

export default function DotationsPage() {
  const [user, setUser] = useState(null)
  const [dotations, setDotations] = useState([])
  const [nbEnRetard, setNbEnRetard] = useState(0)
  const [activeStocks, setActiveStocks] = useState([]) // Matériels de la section
  const [contrats, setContrats] = useState([]) // Joueurs/staff actifs
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showLossModal, setShowLossModal] = useState(false)
  const [selectedDotation, setSelectedDotation] = useState(null)

  // Filtres & Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [statutFilter, setStatutFilter] = useState('EN_COURS') // Par défaut "EN_COURS" comme dans ton index()
  const [enRetardFilter, setEnRetardFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Formulaires
  const [form, setForm] = useState({
    contrat_id: '',
    stock_section_id: '',
    quantite: '1',
    date_remise: new Date().toISOString().split('T')[0],
    date_retour_prevue: '',
    observations: ''
  })
  
  const [lossForm, setLossForm] = useState({ statut: 'PERDU_NON_PAYE', observations: '' })

  useEffect(() => {
    const stored = localStorage.getItem('sbee_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  // Chargement des dotations
  const fetchDotations = useCallback(async (page = 1) => {
    if (!user) return
    setLoading(true)
    try {
      const params = {
        page,
        statut: statutFilter || undefined,
        en_retard: enRetardFilter ? 1 : undefined,
      }
      
      const { data } = await api.get('/dotations', { params })
      
      // Adaptation selon la structure retournée par ton contrôleur (dotations imbriqué ou paginé)
      const resDotations = data.dotations?.data ?? data.dotations ?? []
      setDotations(resDotations)
      setNbEnRetard(data.nb_en_retard ?? 0)
      setCurrentPage(data.dotations?.current_page ?? 1)
      setLastPage(data.dotations?.last_page ?? 1)
    } catch (err) {
      console.error("Erreur lors du chargement des dotations", err)
    } finally {
      setLoading(false)
    }
  }, [user, statutFilter, enRetardFilter])

  useEffect(() => {
    fetchDotations(1)
  }, [fetchDotations])
// Charger les listes de sélection pour la création d'une dotation
  useEffect(() => {
    if (!user || !showModal) return
    
    // Charger le stock de la section
    api.get('/stocks').then(({ data }) => {
      const list = data.stocks?.data ?? data.stocks ?? []
      setActiveStocks(list.filter(s => s.quantite_disponible > 0))
    }).catch(err => console.error(err))

    // CORRECTION ICI : On demande tous les contrats actifs sans limite de page
    api.get('/contrats?no_paginate=1&statut=ACTIF').then(({ data }) => {
      setContrats(data.data ?? []) // Récupère directement le tableau complet
    }).catch(err => console.error(err))
  }, [user, showModal])

  // Soumettre une nouvelle attribution
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/dotations', form)
      alert("Dotation enregistrée avec succès !")
      setShowModal(false)
      // Reset du formulaire
      setForm({
        contrat_id: '',
        stock_section_id: '',
        quantite: '1',
        date_remise: new Date().toISOString().split('T')[0],
        date_retour_prevue: '',
        observations: ''
      })
      fetchDotations(1)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors de l'attribution.")
    } finally {
      setSubmitting(false)
    }
  }

  // Enregistrer un retour (Restitution)
  async function handleRetourner(id) {
    const dateToday = new Date().toISOString().split('T')[0]
    const dateEffective = window.prompt("Confirmer la date de retour effective (AAAA-MM-JJ) :", dateToday)
    
    if (dateEffective === null) return // Annulation

    try {
      await api.patch(`/dotations/${id}/retourner`, {
        date_retour_effective: dateEffective,
        observations: 'Rendu au magasin de la section.'
      })
      alert("Le matériel a bien été réintégré au stock.")
      fetchDotations(currentPage)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors de l'enregistrement du retour.")
    }
  }

  // Déclarer un équipement perdu
  async function handleDeclarerPerdu(e) {
    e.preventDefault()
    if (!selectedDotation) return
    setSubmitting(true)
    try {
      await api.patch(`/dotations/${selectedDotation.id}/declarer-perdu`, lossForm)
      alert(`Matériel déclaré perdu (${lossForm.statut}). Inventaire mis à jour.`);
      setShowLossModal(false)
      setSelectedDotation(null)
      setLossForm({ statut: 'PERDU_NON_PAYE', observations: '' })
      fetchDotations(currentPage)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors de la déclaration de perte.")
    } finally {
      setSubmitting(false)
    }
  }

  // Vérifier si un item individuel est en retard (pour affichage conditionnel)
  function isItemInRetard(d) {
    if (d.statut !== 'EN_COURS' || !d.date_retour_prevue) return false
    return new Date(d.date_retour_prevue) < new Date()
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER AVEC STATS RAPIDES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Dotations & Matériels Joueurs
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            Distribution des équipements et suivi des engagements de restitution.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {nbEnRetard > 0 && (
            <div onClick={() => { setStatutFilter('EN_COURS'); setEnRetardFilter(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fee2e2', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>
              <AlertTriangle size={16} color="#dc2626" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c' }}>{nbEnRetard} En retard</span>
            </div>
          )}

          <button onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Nouvelle Dotation
          </button>
        </div>
      </div>

      {/* RECHERCHE ET BARRE DE FILTRES */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        
        <select value={statutFilter} onChange={e => { setStatutFilter(e.target.value); setEnRetardFilter(false); }} style={selectStyle}>
          <option value="EN_COURS">En possession (Actif)</option>
          <option value="RENDU">Restitués (Magasin)</option>
          <option value="PERDU_PAYE">Perdus (Remboursés)</option>
          <option value="PERDU_NON_PAYE">Perdus (Non remboursés)</option>
          <option value="">Tous les statuts</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <input type="checkbox" checked={enRetardFilter} onChange={e => { setEnRetardFilter(e.target.checked); if(e.target.checked) setStatutFilter('EN_COURS'); }} />
          Voir uniquement les retards
        </label>

        <button onClick={() => fetchDotations(1)} style={{ marginLeft: 'auto', padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Actualiser
        </button>
      </div>

      {/* TABLEAU */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: '#ed1f24', margin: '0 auto' }} /></div>
      ) : dotations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <UserCheck size={36} style={{ color: '#d1d5db', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0 }}>Aucune dotation trouvée avec ces critères.</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8e8e8', color: '#4b5563', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Bénéficiaire</th>
                  <th style={{ padding: '12px 16px' }}>Matériel</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Quantité</th>
                  <th style={{ padding: '12px 16px' }}>Planification & Suivi</th>
                  <th style={{ padding: '12px 16px' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dotations.map(d => {
                  const enRetardItem = isItemInRetard(d)
                  const cfg = STATUT_CONFIG[d.statut] || { bg: '#f3f4f6', text: '#374151', label: d.statut }
                  const nomBeneficiaire = d.contrat?.personne 
                    ? `${d.contrat.personne.nom} ${d.contrat.personne.prenoms}`
                    : `Contrat #${d.contrat_id}`

                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6', background: enRetardItem ? '#fef2f2' : '#fff' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{nomBeneficiaire}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          {d.contrat?.section?.nom || 'Section Sportive'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                        {d.stock_section?.type_materiel?.libelle || 'Matériel supprimé'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                        {d.quantite} {d.stock_section?.type_materiel?.unite ?? 'u'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4b5563' }}>
                          <Calendar size={12} /> Donné le : {d.date_remise}
                        </div>
                        {d.date_retour_prevue && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: enRetardItem ? '#dc2626' : '#6b7280', fontWeight: enRetardItem ? 600 : 400 }}>
                            {enRetardItem ? <AlertTriangle size={12} /> : <History size={12} />}
                            {d.statut === 'RENDU' ? `Rendu le : ${d.date_retour_effective}` : `Attendu : ${d.date_retour_prevue}`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: cfg.bg, color: cfg.text }}>
                          {cfg.label}
                        </span>
                        {enRetardItem && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: 4, marginLeft: 6 }}>
                            RETARD
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {d.statut === 'EN_COURS' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button onClick={() => handleRetourner(d.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              <CheckCircle size={13} /> Rendre
                            </button>
                            <button onClick={() => { setSelectedDotation(d); setShowLossModal(true); }}
                              style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', background: '#fff', border: '1px solid #e5e7eb', color: '#6b7280', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                              Perdu ?
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {lastPage > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button disabled={currentPage === 1} onClick={() => fetchDotations(currentPage - 1)} style={pagBtnStyle}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Page {currentPage} / {lastPage}</span>
              <button disabled={currentPage === lastPage} onClick={() => fetchDotations(currentPage + 1)} style={pagBtnStyle}><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}

      {/* MODAL AJOUT (DISTRIBUER MATÉRIEL) */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Distribuer un équipement</h3>
              <button onClick={() => setShowModal(false)} style={closeBtn}><X size={14} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Bénéficiaire (Joueur/Staff Actif) *</label>
                <select required value={form.contrat_id} onChange={e => setForm(f => ({ ...f, contrat_id: e.target.value }))} style={inputStyle}>
                  <option value="">-- Sélectionner le membre --</option>
                  {contrats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.personne?.nom} {c.personne?.prenoms} ({c.type_contrat || 'Membre'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Matériel en Stock *</label>
                <select required value={form.stock_section_id} onChange={e => setForm(f => ({ ...f, stock_section_id: e.target.value }))} style={inputStyle}>
                  <option value="">-- Choisir l'article du magasin --</option>
                  {activeStocks.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.type_materiel?.libelle} (Dispo : {s.quantite_disponible} {s.type_materiel?.unite} | {s.type_materiel?.recuperable ? 'Durable/Récupérable' : 'Consommable'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Quantité *</label>
                  <input type="number" min="1" required value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date de remise *</label>
                  <input type="date" required value={form.date_remise} onChange={e => setForm(f => ({ ...f, date_remise: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Date retour prévue <span style={{color: '#9ca3af', fontSize:10}}>(Obligatoire si récupérable)</span></label>
                <input type="date" value={form.date_retour_prevue} onChange={e => setForm(f => ({ ...f, date_retour_prevue: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Observations / Commentaires</label>
                <input type="text" placeholder="Ex: Équipement match aller championnat de Ligue" value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} style={inputStyle} />
              </div>

              <button type="submit" disabled={submitting} style={submitBtn}>
                {submitting ? 'Traitement...' : 'Enregistrer la Dotation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉCLARATION DE PERTE */}
      {showLossModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#b91c1c' }}>🔴 Déclarer un matériel perdu</h3>
              <button onClick={() => { setShowLossModal(false); setSelectedDotation(null); }} style={closeBtn}><X size={14} /></button>
            </div>

            <form onSubmit={handleDeclarerPerdu} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, margin: 0, color: '#4b5563' }}>
                Vous signalez que le matériel confié à <strong>{selectedDotation?.contrat?.personne?.nom}</strong> ne pourra pas être restitué.
              </p>

              <div>
                <label style={labelStyle}>Régime de perte *</label>
                <select required value={lossForm.statut} onChange={e => setLossForm(f => ({ ...f, statut: e.target.value }))} style={inputStyle}>
                  <option value="PERDU_NON_PAYE">PERDU_NON_PAYE (Perte sèche pour la section)</option>
                  <option value="PERDU_PAYE">PERDU_PAYE (Le joueur va rembourser / être prélevé)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Circonstances / Justification *</label>
                <textarea required rows="3" placeholder="Expliquez brièvement comment ou pourquoi l'équipement a été égaré..." value={lossForm.observations} onChange={e => setLossForm(f => ({ ...f, observations: e.target.value }))} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
              </div>

              <button type="submit" disabled={submitting} style={{ ...submitBtn, background: '#b91c1c' }}>
                {submitting ? 'Mise à jour...' : 'Valider la Perte'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// STYLES ACCESSOIRES HARMONISÉS SBEE SPORT
const selectStyle = { padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', outline: 'none' }
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const modalContent = { background: '#fff', borderRadius: 12, maxWidth: 500, width: '100%', padding: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }
const closeBtn = { border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block', textTransform: 'uppercase' }
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa', boxSizing: 'border-box' }
const submitBtn = { width: '100%', padding: '10px 14px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 6 }
const pagBtnStyle = { padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }