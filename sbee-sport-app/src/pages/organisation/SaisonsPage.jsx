import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Edit2, CheckCircle2, XCircle, X, Power, Check } from 'lucide-react'
import api from '@/services/authService'

export default function SaisonsPage() {
  const [saisons, setSaisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Système de Toast / Notification locale
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // États du Modal / Formulaire
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSaison, setEditingSaison] = useState(null)
  const [nom, setNom] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  // Fonction pour déclencher une notification temporaire
  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' })
    }, 4000) // Disparaît après 4 secondes
  }

  // Helper pour formater proprement les dates au format local (fr-FR)
  const formatSaisonDate = (dateString) => {
    if (!dateString) return '-'
    // Forcer l'interprétation locale de la date pour éviter les décalages de fuseau horaire
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // 1. Charger les saisons
  const fetchSaisons = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/saisons')
      setSaisons(response.data.saisons || [])
    } catch (err) {
      const messageErreur = err.response?.data?.message || "Impossible de récupérer la liste des saisons."
      setError(messageErreur)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSaisons()
  }, [])

  const handleCreateOpen = () => {
    setEditingSaison(null)
    setNom('')
    setDateDebut('')
    setDateFin('')
    setIsModalOpen(true)
  }

  const handleEditOpen = (saison) => {
    setEditingSaison(saison)
    setNom(saison.nom)
    
    const formattedDebut = saison.date_debut ? new Date(saison.date_debut).toISOString().split('T')[0] : ''
    const formattedFin = saison.date_fin ? new Date(saison.date_fin).toISOString().split('T')[0] : ''
    
    setDateDebut(formattedDebut)
    setDateFin(formattedFin)
    setIsModalOpen(true)
  }

  // 2. Soumission (Création / Modification)
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const payload = editingSaison 
      ? { nom, date_fin: dateFin } 
      : { nom, date_debut: dateDebut, date_fin: dateFin }

    try {
      if (editingSaison) {
        await api.put(`/saisons/${editingSaison.id}`, payload)
        showToast(`La saison "${nom}" a bien été modifiée !`)
      } else {
        await api.post('/saisons', payload)
        showToast(`La saison "${nom}" a été créée avec succès !`)
      }

      setIsModalOpen(false)
      fetchSaisons() 
    } catch (err) {
      showToast(err.response?.data?.message || "Une erreur est survenue.", 'error')
    }
  }

  // 3. Activation d'une saison (Bouton Power)
  const handleActiver = async (saison) => {
    if (!confirm(`Voulez-vous définir la "${saison.nom}" comme période d'activité courante ? Cela désactivera la saison précédente.`)) return

    try {
      await api.patch(`/saisons/${saison.id}/activer`)
      showToast(`La "${saison.nom}" est désormais la saison active pour le club !`, 'success')
      fetchSaisons() 
    } catch (err) {
      showToast(err.response?.data?.message || "Impossible de basculer la saison.", 'error')
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      
      {/* 🔔 BANNIÈRE DE NOTIFICATION FLOTTANTE */}
      {notification.show && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px',
          zIndex: 200, display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 20px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          background: notification.type === 'success' ? '#def7ec' : '#fde8e8',
          color: notification.type === 'success' ? '#03543f' : '#9b1c1c',
          borderLeft: `5px solid ${notification.type === 'success' ? '#31c48d' : '#f05252'}`,
          animation: 'slideIn 0.3s ease-out', fontWeight: '500', fontSize: '14px'
        }}>
          {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
           
            Gestion des Saisons
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Configurez, modifiez et basculez les périodes d'activités sportives de la SBEE.
          </p>
        </div>

        <button
          onClick={handleCreateOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#ed1f24', color: '#fff',
            border: 'none', padding: '10px 16px', borderRadius: '6px',
            fontWeight: '600', cursor: 'pointer', fontSize: '14px'
          }}
        >
          
          Nouvelle Saison
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fde8e8', color: '#9b1c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: '500' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tableau des Saisons */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontWeight: '500' }}>
          Chargement des données en cours...
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Nom de la Saison</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Date de Début</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Date de Fin</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Statut</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {saisons.map((saison) => (
                <tr key={saison.id} style={{ borderBottom: '1px solid #e5e7eb', background: saison.is_active ? '#fdf8f8' : '#fff' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#111827' }}>{saison.nom}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{formatSaisonDate(saison.date_debut)}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{formatSaisonDate(saison.date_fin)}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
                      background: saison.is_active ? '#def7ec' : '#f3f4f6',
                      color: saison.is_active ? '#03543f' : '#4b5563'
                    }}>
                      {saison.is_active ? null : null}
                      {saison.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      
                      {!saison.is_active && (
                        <button
                          onClick={() => handleActiver(saison)}
                          style={{ background: 'none', border: 'none', color: '#057a55', cursor: 'pointer', padding: '4px' }}
                          title="Activer cette saison"
                        >
                          <Power size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => handleEditOpen(saison)}
                        style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '4px' }}
                        title="Modifier la saison"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {saisons.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    Aucune saison configurée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulaire */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '450px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                {editingSaison ? 'Modifier la Saison' : 'Créer une Nouvelle Saison'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Nom de la saison *</label>
                <input
                  type="text" required placeholder="Ex: Saison 2026-2027"
                  value={nom} onChange={(e) => setNom(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Date de début *</label>
                  <input
                    type="date" required
                    disabled={!!editingSaison} 
                    value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: editingSaison ? '#f3f4f6' : '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Date de fin *</label>
                  <input
                    type="date" required
                    value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#4b5563' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 16px', border: 'none', background: '#ed1f24', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                  {editingSaison ? 'Enregistrer les modifications' : 'Créer la saison'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}