import { useState, useEffect, useCallback } from 'react'
import api from '@/services/authService'
import {
  Layers, Package, Plus, Loader2, ShieldAlert, X, Search, ChevronLeft, ChevronRight
} from 'lucide-react'

const CATEGORIE_LABELS = {
  CONSOMMABLE: 'Consommable (Jetable/Unique)',
  DURABLE: 'Durable (Équipement permanent)'
}



export default function StocksPage() {
  const [user, setUser] = useState(null)
  const [stocks, setStocks] = useState([])
  const [typesMateriels, setTypesMateriels] = useState([])
  const [sections, setSections] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nbSousSeuil, setNbSousSeuil] = useState(0)

  // Pagination & Filtres
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [sectionFilter, setSectionFilter] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSousSeuilOnly, setShowSousSeuilOnly] = useState(false)

  // Modals
  const [showInitModal, setShowInitModal] = useState(false)
  const [showCatalogModal, setShowCatalogModal] = useState(false) // Nouveau modal pour le catalogue
  const [showMouvModal, setShowMouvModal] = useState(null) 
  const [mouvTypeAction, setMouvTypeAction] = useState('ENTREE') 

  // Formulaires
  const [formInit, setFormInit] = useState({ section_id: '', type_materiel_id: '', quantite_totale: '0', seuil_alerte: '5', commentaire: '' })
  const [formMouv, setFormMouv] = useState({ quantite: '', type: 'ACHAT', commentaire: '' })
  
  // Nouveau formulaire pour enrichir le catalogue général
  const [formCatalog, setFormCatalog] = useState({ libelle: '', categorie: 'DURABLE', recuperable: '1', unite: 'unités', description: '' })

  useEffect(() => {
    const stored = localStorage.getItem('sbee_user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser(parsed)
      if (!['SUPER_ADMIN', 'TRESORIER'].includes(parsed.role_systeme)) {
        setSectionFilter(parsed.section_id ? String(parsed.section_id) : '')
        setFormInit(f => ({ ...f, section_id: String(parsed.section_id) }))
      }
    }
  }, [])

  // Chargement du catalogue général (Correction de la clé JSON reçue)
  const fetchCatalogue = useCallback(async () => {
    try {
      const { data } = await api.get('/types-materiels')
      // S'aligne strictement sur la clé 'types_materiels' de ton StockController.php
      setTypesMateriels(data.types_materiels ?? []) 
    } catch (err) {
      console.error("Erreur lors du chargement du catalogue", err)
    }
  }, [])

  const fetchStocks = useCallback(async (page = 1) => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await api.get('/stocks', {
        params: {
          page,
          section_id: sectionFilter || undefined,
          categorie: categorieFilter || undefined,
          search: searchQuery || undefined,
          sous_seuil: showSousSeuilOnly ? 1 : undefined
        }
      })
      setStocks(data.stocks?.data ?? [])
      setCurrentPage(data.stocks?.current_page ?? 1)
      setLastPage(data.stocks?.last_page ?? 1)
      setNbSousSeuil(data.nb_sous_seuil ?? 0)
    } catch (err) {
      console.error("Erreur lors du chargement des stocks", err)
    } finally {
      setLoading(false)
    }
  }, [user, sectionFilter, categorieFilter, searchQuery, showSousSeuilOnly])

  useEffect(() => {
    fetchStocks(1)
  }, [fetchStocks, sectionFilter, categorieFilter, showSousSeuilOnly])

  useEffect(() => {
    if (!user) return
    fetchCatalogue()
    api.get('/sections').then(({ data }) => setSections(data.sections ?? data.data ?? []))
  }, [user, fetchCatalogue])

  const isComptable = user?.role_systeme === 'SUPER_ADMIN' || user?.role_systeme === 'TRESORIER'

  // Action : Enregistrer un nouvel article dans le catalogue général (Durable ou Consommable)
  async function handleCreateCatalogItem(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Appel direct de ta route POST /api/types-materiels
      await api.post('/types-materiels', {
        ...formCatalog,
        // Conversion de la chaîne du select en booléen pur pour Laravel
        recuperable: formCatalog.recuperable === '1' 
      })
      alert("Nouvel article ajouté avec succès au catalogue général !")
      setShowCatalogModal(false)
      setFormCatalog({ libelle: '', categorie: 'DURABLE', recuperable: '1', unite: 'unités', description: '' })
      // Recharger immédiatement la liste pour qu'elle apparaisse dans la sélection
      fetchCatalogue() 
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur lors de la création de l'article.")
    } finally {
      setSubmitting(false)
    }
  }

  // Action : Initialiser une ligne de stock pour sa section
  async function handleCreateStock(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/stocks', formInit)
      setShowInitModal(false)
      setFormInit({ section_id: isComptable ? '' : String(user.section_id), type_materiel_id: '', quantite_totale: '0', seuil_alerte: '5', commentaire: '' })
      fetchStocks(1)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur d'initialisation.")
    } finally {
      setSubmitting(false)
    }
  }

  // Action : Ajustement (Mouvements)
  async function handleMouvementStock(e) {
    e.preventDefault()
    setSubmitting(true)
    const endpoint = mouvTypeAction === 'ENTREE' ? `/stocks/${showMouvModal.id}/ajouter` : `/stocks/${showMouvModal.id}/retirer`
    try {
      await api.post(endpoint, formMouv)
      setShowMouvModal(null)
      setFormMouv({ quantite: '', type: 'ACHAT', commentaire: '' })
      fetchStocks(currentPage)
    } catch (err) {
      alert(err.response?.data?.message ?? "Erreur de mouvement.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Gestion des Stocks & Équipements
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
            Suivi des matériels sportifs, dotations actives et seuils critiques par section SBEE.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          {/* NOUVEAU BOUTON : AJOUTER AU CATALOGUE */}
          <button onClick={() => setShowCatalogModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Enregistrer un Matériel
          </button>

          <button onClick={() => setShowInitModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#ed1f24', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Initialiser un Stock
          </button>
        </div>
      </div>

      {/* DASHBOARD INDICATORS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#f3f4f6', padding: 10, borderRadius: 10, color: '#4b5563' }}><Package size={22} /></div>
          <div>
            <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Suivi Général</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '2px 0 0' }}>Fiches d'inventaires actives</p>
          </div>
        </div>
        
        <div onClick={() => setShowSousSeuilOnly(!showSousSeuilOnly)} 
          style={{ background: nbSousSeuil > 0 ? '#fffbeb' : '#fff', border: nbSousSeuil > 0 ? '1px solid #fde68a' : '1px solid #e8e8e8', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: '0.2s' }}>
          <div style={{ background: nbSousSeuil > 0 ? '#fef3c7' : '#f3f4f6', padding: 10, borderRadius: 10, color: nbSousSeuil > 0 ? '#d97706' : '#4b5563' }}><ShieldAlert size={22} /></div>
          <div>
            <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Matériels sous le Seuil</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: nbSousSeuil > 0 ? '#b45309' : '#111827', margin: '2px 0 0' }}>
              {nbSousSeuil} {showSousSeuilOnly ? ' (Filtre actif)' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', minWidth: 260, flex: 1 }}>
          <Search size={16} color="#9ca3af" />
          <input type="text" placeholder="Rechercher un matériel (ex: Ballon...)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchStocks(1)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%' }} />
        </div>

        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} disabled={!isComptable} style={selectStyle}>
          <option value="">Toutes les sections SBEE</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.discipline?.nom})</option>)}
        </select>

        <select value={categorieFilter} onChange={e => setCategorieFilter(e.target.value)} style={selectStyle}>
          <option value="">Toutes les catégories</option>
          {Object.entries(CATEGORIE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <button onClick={() => fetchStocks(1)} style={{ padding: '8px 14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Filtrer
        </button>
      </div>

      {/* STOCKS TABLE */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: '#ed1f24', margin: '0 auto' }} /></div>
      ) : stocks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <Layers size={36} style={{ color: '#d1d5db', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0 }}>Aucun inventaire actif trouvé.</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8e8e8', color: '#4b5563', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Matériel</th>
                  <th style={{ padding: '12px 16px' }}>Section Sportive</th>
                  <th style={{ padding: '12px 16px' }}>Type Catégorie</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Acquis</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>En Dotation Active</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Dispo Magasin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ajustements</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => {
                  const estSousSeuil = s.seuil_alerte > 0 && s.quantite_disponible <= s.seuil_alerte;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6', background: estSousSeuil ? '#fff9f0' : '#fff' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{s.type_materiel?.libelle}</div>
                        <div style={{ fontSize: 11, color: s.type_materiel?.recuperable ? '#6366f1' : '#6b7280', marginTop: 2, fontWeight: 500 }}>
                          {s.type_materiel?.recuperable ? '⚠️ Restitution obligatoire' : 'Consommable (Dotation définitive)'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: '#374151' }}>
                        {s.section?.nom} <span style={{ fontSize: 11, color: '#9ca3af' }}>({s.section?.discipline?.nom})</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6b7280' }}>
                        {CATEGORIE_LABELS[s.type_materiel?.categorie] || s.type_materiel?.categorie}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>{s.quantite_totale} {s.type_materiel?.unite}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#2563eb', fontWeight: 600 }}>
                        {s.nb_dotations_actives ?? s.quantite_en_dotation}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: estSousSeuil ? '#dc2626' : '#16a34a' }}>{s.quantite_disponible}</span>
                          {estSousSeuil && <span style={{ fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Alerte</span>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => { setShowMouvModal(s); setMouvTypeAction('ENTREE'); setFormMouv(f => ({ ...f, type: 'ACHAT' })) }}
                            style={{ padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            + Réassort
                          </button>
                          <button onClick={() => { setShowMouvModal(s); setMouvTypeAction('SORTIE'); setFormMouv(f => ({ ...f, type: 'CASSE' })) }}
                            style={{ padding: '4px 8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            - Retrait
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION PANEL */}
          {lastPage > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button disabled={currentPage === 1} onClick={() => fetchStocks(currentPage - 1)} style={pagBtnStyle}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Page {currentPage} / {lastPage}</span>
              <button disabled={currentPage === lastPage} onClick={() => fetchStocks(currentPage + 1)} style={pagBtnStyle}><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}

      {/* NOUVEAU MODAL : AJOUTER UN MATÉRIEL AU CATALOGUE GÉNÉRAL */}
      {showCatalogModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Enregistrer un article au catalogue SBEE</h3>
              <button onClick={() => setShowCatalogModal(false)} style={closeBtn}><X size={14} /></button>
            </div>
            
            <form onSubmit={handleCreateCatalogItem} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom de l'article / Libellé *</label>
                <input type="text" required placeholder="Ex: Ballon de Football FIFA Size 5" value={formCatalog.libelle} onChange={e => setFormCatalog(f => ({ ...f, libelle: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Nature du matériel *</label>
                  <select value={formCatalog.categorie} onChange={e => setFormCatalog(f => ({ ...f, categorie: e.target.value }))} style={inputStyle}>
                    <option value="DURABLE">Équipement Durable</option>
                    <option value="CONSOMMABLE">Consommable / Jetable</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Restitution Requise ? *</label>
                  <select value={formCatalog.recuperable} onChange={e => setFormCatalog(f => ({ ...f, recuperable: e.target.value }))} style={inputStyle}>
                    <option value="1">Oui (Doit être rendu)</option>
                    <option value="0">Non (Don définitif)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Unité de mesure</label>
                <input type="text" placeholder="Ex: unités, paires, lots" value={formCatalog.unite} onChange={e => setFormCatalog(f => ({ ...f, unite: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description technique</label>
                <textarea rows={2} placeholder="Spécifications (Marque, usage...)" value={formCatalog.description} onChange={e => setFormCatalog(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <button type="submit" disabled={submitting} style={submitBtn}>
                {submitting ? 'Enregistrement...' : 'Ajouter au catalogue général'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : INITIALISER UN INVENTAIRE SECTION */}
      {showInitModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Ouvrir une fiche d'inventaire</h3>
              <button onClick={() => setShowInitModal(false)} style={closeBtn}><X size={14} /></button>
            </div>
            
            <form onSubmit={handleCreateStock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isComptable ? (
                <div>
                  <label style={labelStyle}>Section sportive détentrice *</label>
                  <select required value={formInit.section_id} onChange={e => setFormInit(f => ({ ...f, section_id: e.target.value }))} style={inputStyle}>
                    <option value="">-- Choisir la section --</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Section sportive</label>
                  <input type="text" readOnly value={user?.section_id ? sections.find(s => s.id === user.section_id)?.nom || 'Ma Section' : ''} style={{ ...inputStyle, background: '#f3f4f6', cursor: 'not-allowed' }} />
                </div>
              )}

              <div>
                <label style={labelStyle}>Choisir l'article du catalogue *</label>
                <select required value={formInit.type_materiel_id} onChange={e => setFormInit(f => ({ ...f, type_materiel_id: e.target.value }))} style={inputStyle}>
                  <option value="">-- Sélectionner l'article ({typesMateriels.length} dispos) --</option>
                  {typesMateriels.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.libelle} [{t.categorie}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Quantité Initiale *</label>
                  <input type="number" min="0" required value={formInit.quantite_totale} onChange={e => setFormInit(f => ({ ...f, quantite_totale: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Seuil d'alerte</label>
                  <input type="number" min="0" value={formInit.seuil_alerte} onChange={e => setFormInit(f => ({ ...f, seuil_alerte: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Note d'ouverture</label>
                <input type="text" value={formInit.commentaire} onChange={e => setFormInit(f => ({ ...f, commentaire: e.target.value }))} placeholder="Ex: Stock initial dotation 2026" style={inputStyle} />
              </div>

              <button type="submit" disabled={submitting} style={submitBtn}>
                {submitting ? 'Création...' : 'Ouvrir la fiche de stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : MOUVEMENTS (AJOUTER / RETIRER) */}
      {showMouvModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  {mouvTypeAction === 'ENTREE' ? 'Réapprovisionner' : 'Retirer des articles'}
                </h3>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                  {showMouvModal.type_materiel?.libelle}
                </p>
              </div>
              <button onClick={() => setShowMouvModal(null)} style={closeBtn}><X size={14} /></button>
            </div>
            
            <form onSubmit={handleMouvementStock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Quantité *</label>
                  <input type="number" min="1" required value={formMouv.quantite} onChange={e => setFormMouv(f => ({ ...f, quantite: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Motif *</label>
                  {mouvTypeAction === 'ENTREE' ? (
                    <select value={formMouv.type} onChange={e => setFormMouv(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                      <option value="ACHAT">Nouvel Achat</option>
                      <option value="AJUSTEMENT">Ajustement Inventaire (+)</option>
                    </select>
                  ) : (
                    <select value={formMouv.type} onChange={e => setFormMouv(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                      <option value="CASSE">Matériel Cassé</option>
                      <option value="PERTE">Matériel Perdu</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Commentaire détaillé *</label>
                <textarea required rows={3} value={formMouv.commentaire} onChange={e => setFormMouv(f => ({ ...f, commentaire: e.target.value }))} style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <button type="submit" disabled={submitting} style={{ ...submitBtn, background: mouvTypeAction === 'ENTREE' ? '#16a34a' : '#dc2626' }}>
                {submitting ? 'Traitement...' : `Confirmer`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// STYLES DESIGN SYSTEM
const selectStyle = { padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#fafafa', outline: 'none' }
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const modalContent = { background: '#fff', borderRadius: 12, maxWidth: 460, width: '100%', padding: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }
const closeBtn = { border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block', textTransform: 'uppercase' }
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa', boxSizing: 'border-box' }
const submitBtn = { width: '100%', padding: '10px 14px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 6 }
const pagBtnStyle = { padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }