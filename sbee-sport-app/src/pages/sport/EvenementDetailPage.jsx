import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/services/authService'
import {
  ArrowLeft, Users, UserCheck, Trophy, AlertTriangle,
  Shield, Lock, Unlock, CheckCircle, XCircle, Save,
  Loader2, Plus, Minus, Edit2, Trash2, X, Clock,
  MapPin, Calendar, Star, AlertCircle, RefreshCw,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

// ── Configs ──
const TYPE_CONFIG = {
  MATCH:        { label: 'Match',         icon: '', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ENTRAINEMENT: { label: 'Entraînement',  icon: '', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
 
}

const STATUT_CONFIG = {
  PLANIFIE: { label: 'Planifié', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  EN_COURS: { label: 'En cours', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  TERMINE:  { label: 'Terminé',  bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  ANNULE:   { label: 'Annulé',   bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const RESULTAT_CONFIG = {
  VICTOIRE:   { label: 'Victoire',   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  DEFAITE:    { label: 'Défaite',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  NUL:        { label: 'Nul',        color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  EN_ATTENTE: { label: 'En attente', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
}

const SANCTION_CONFIG = {
  JAUNE:           { label: 'Carton Jaune',   emoji: '🟨', color: '#d97706' },
  ROUGE:           { label: 'Carton Rouge',   emoji: '🟥', color: '#dc2626' },
  BLEU:            { label: 'Carton Bleu',    emoji: '🟦', color: '#2563eb' },
  FAUTE_TECHNIQUE: { label: 'Faute Tech.',    emoji: '⚠️', color: '#7c3aed' },
  EXCLUSION:       { label: 'Exclusion',      emoji: '🚫', color: '#991b1b' },
}

const ROLE_MATCH_CONFIG = {
  PRINCIPAL: { label: 'Coach Principal', emoji: '' },
  ADJOINT:   { label: 'Coach Adjoint',   emoji: '' },
  KINE:      { label: 'Kiné',            emoji: '' },
  MEDECIN:   { label: 'Médecin',         emoji: '' },
  INTENDANT: { label: 'Intendant',       emoji: '' },
}

// Métriques par discipline
const METRIQUES_FOOTBALL   = ['But', 'Passe_Décisive', 'Tir_Cadré', 'Tacle', 'Interception', 'Faute']
const METRIQUES_BASKETBALL = ['Point', 'Rebond_Off', 'Rebond_Def', 'Passe_Décisive', 'Contre', 'Interception', 'Faute']
const METRIQUES_HANDBALL   = ['But', 'Arrêt', 'Passe_Décisive', 'Faute', 'Tir_Poteau']
const METRIQUES_DEFAULT    = ['Performance', 'Point', 'Faute']

function getMetriques(discipline) {
  const n = discipline?.toLowerCase() ?? ''
  if (n.includes('foot'))   return METRIQUES_FOOTBALL
  if (n.includes('basket')) return METRIQUES_BASKETBALL
  if (n.includes('hand'))   return METRIQUES_HANDBALL
  return METRIQUES_DEFAULT
}

function Avatar({ photoUrl, nom, prenoms, size = 34 }) {
  const [err, setErr] = useState(false)
  const url = photoUrl ? (photoUrl.startsWith('http') ? photoUrl : `${API_BASE}/storage/${photoUrl}`) : null
  const ini = `${prenoms?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase() || '?'
  return (
    <div style={{ width: size, height: size, borderRadius: 7, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 700, color: '#ed1f24', flexShrink: 0, overflow: 'hidden' }}>
      {url && !err ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} /> : ini}
    </div>
  )
}

function JoueurCard({ participation, verrouille, onToggleTitulaire, onTogglePresence, onPerf, onSanc, onRetirer, isTitulaire }) {
  const p = participation
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e8e8e8', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      {/* ... (votre code existant pour l'Avatar et le Nom du joueur) ... */}
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.contrat?.personne?.prenoms} {p.contrat?.personne?.nom}
        </p>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
          {p.contrat?.poste_cle ?? 'Poste ?'}{p.contrat?.numero_maillot ? ` · N°${p.contrat.numero_maillot}` : ''}
        </p>
      </div>

      {/* Ajout de l'affichage de la prime (Robuste et typé) */}
      {p.prime_calculee !== undefined && p.prime_calculee !== null && (
      <span style={{ 
    fontSize: 11, 
    fontWeight: 700, 
    color: '#059669', 
    background: '#f0fdf4', 
    padding: '2px 8px', 
    borderRadius: 4,
    border: '1px solid #bbf7d0',
    marginRight: 8 
    }}>
    {Number(p.prime_calculee).toLocaleString('fr-FR')} FCFA
    </span>
)}

      {/* Boutons d'action (seulement si non verrouillé) */}
      {!verrouille && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={onTogglePresence} title={p.is_present ? 'Marquer Absent' : 'Marquer Présent'}
            style={{ padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 6, background: p.is_present ? '#f0fdf4' : '#fff', color: p.is_present ? '#059669' : '#9ca3af', cursor: 'pointer' }}>
            <UserCheck size={14} />
          </button>
          <button onClick={onToggleTitulaire} title={isTitulaire ? 'Passer Remplaçant' : 'Passer Titulaire'}
            style={{ padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 6, background: isTitulaire ? '#fffbeb' : '#fff', color: isTitulaire ? '#d97706' : '#9ca3af', cursor: 'pointer' }}>
            <Star size={14} fill={isTitulaire ? '#d97706' : 'none'} />
          </button>
          <button onClick={onPerf} title="Ajouter Performance"
            style={{ padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#4b5563', cursor: 'pointer' }}>
            <Trophy size={14} />
          </button>
          <button onClick={onSanc} title="Mettre une sanction"
            style={{ padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
            <AlertTriangle size={14} />
          </button>
          <button onClick={onRetirer} title="Retirer de la composition"
            style={{ padding: '5px 7px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function EvenementDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evt, setEvt]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [tab, setTab]       = useState('composition')
  const [saving, setSaving] = useState(false)

  const [membres, setMembres]               = useState([])  
  const [participations, setParticipations] = useState([])
  const [staffing, setStaffing]             = useState([])
  const [membresLoading, setMembresLoading] = useState(false)

  const [selectedStaffRole, setSelectedStaffRole] = useState('PRINCIPAL')

  const [showResultat, setShowResultat] = useState(false)
  const [resultatForm, setResultatForm] = useState({ resultat: '', score_nous: '', score_adversaire: '', observations: '' })

  const [showPerf, setShowPerf] = useState(null) 
  const [perfForm, setPerfForm] = useState({})

  const [showSanc, setShowSanc] = useState(null)
  const [sancForm, setSancForm] = useState({ type: 'JAUNE', motif: '', minute_jeu: '' })

  const fetchEvt = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get(`/evenements/${id}`)
      const evenement = data.evenement ?? data
      setEvt(evenement)
      setParticipations(evenement.participations ?? [])
      setStaffing(evenement.staffing_matchs ?? [])
      
      // ALIGNEMENT : On mappe score_adversaire (Laravel) vers notre champ local score_adversaire
      if (evenement.resultat) {
        setResultatForm({
          resultat:         evenement.resultat ?? '',
          score_nous:       evenement.score_nous ?? '',
          score_adversaire: evenement.score_adversaire ?? '',
          observations:     evenement.observations ?? '',
        })
      }
    } catch {
      setError('Impossible de charger l\'événement.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchMembres = useCallback(async () => {
    if (!evt?.section_id) return
    setMembresLoading(true)
    try {
      const { data } = await api.get('/personnes', {
        params: { section_id: evt.section_id, statut: 'ACTIF', per_page: 100 },
      })
      setMembres(data.data ?? [])
    } catch {}
    finally { setMembresLoading(false) }
  }, [evt?.section_id])

  useEffect(() => { fetchEvt() }, [fetchEvt])
  useEffect(() => { if (evt) fetchMembres() }, [fetchMembres, evt])

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Chargement...</p>
    </div>
  )
  if (error || !evt) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
      <p>{error ?? 'Événement introuvable'}</p>
      <button onClick={() => navigate('/evenements')} style={btnSec}>Retour</button>
    </div>
  )

  const type       = TYPE_CONFIG[evt.type]   ?? TYPE_CONFIG.MATCH
  const statut     = STATUT_CONFIG[evt.statut] ?? STATUT_CONFIG.PLANIFIE
  const resultat   = evt.resultat ? RESULTAT_CONFIG[evt.resultat] : null
  const isMatch    = evt.type !== 'ENTRAINEMENT'
  const verrouille = evt.is_verrouille
  const date       = new Date(evt.date_heure)
  const metriques  = getMetriques(evt.section?.discipline?.nom)

  async function synchroniserParticipations(nouvellesParticipations) {
    try {
      const payload = {
        joueurs: nouvellesParticipations.map(p => ({
          contrat_id: p.contrat_id,
          is_titulaire: p.is_titulaire ? 1 : 0,
          is_present: p.is_present ? 1 : 0
        }))
      };
      const { data } = await api.post(`/evenements/${id}/participations`, payload);
      if (data.participations) {
        setParticipations(data.participations);
      } else if (data.data) {
        setParticipations(data.data);
      }
    } catch (err) {
      console.error("Erreur de synchronisation backend:", err.response?.data);
      alert(err.response?.data?.message ?? "Erreur lors de l'enregistrement sur le serveur.");
      fetchEvt();
    }
  }

  const toggleJoueur = async (contratId) => {
  const anciennesParticipations = [...participations];
  
  const existe = participations.find(p => p.contrat_id === contratId);
  let nvl;
  
  if (existe) {
    nvl = participations.filter(p => p.contrat_id !== contratId);
  } else {
    nvl = [...participations, { 
      contrat_id: contratId, 
      is_present: true, 
      is_titulaire: false,
      minutes_jouees: 90,
      contrat: { id: contratId } 
    }];
  }

  setParticipations(nvl);

  try {
    const joueursPayload = nvl.map(p => ({
      contrat_id: p.contrat_id,
      is_present: p.is_present === undefined ? true : Boolean(p.is_present),
      is_titulaire: Boolean(p.is_titulaire),
      minutes_jouees: p.minutes_jouees ?? null
    }));

    // On récupère la réponse du serveur Laravel
    const response = await api.post(`/evenements/${id}/participations`, { joueurs: joueursPayload });
    
    // ✅ TRÈS IMPORTANT : Si Laravel renvoie les participations ou l'événement mis à jour, 
    // on l'injecte directement dans le state pour que l'objet global reste parfaitement synchrone.
    if (response.data?.participations) {
      setParticipations(response.data.participations);
    }

  } catch (err) {
    console.error("Erreur en arrière-plan :", err.response?.data || err);
    alert(`Erreur : ${err.response?.data?.message || "Impossible d'enregistrer ce joueur."}`);
    setParticipations(ancienneParticipations);
    fetchEvt(); // En cas d'erreur on resynchronise de force
  }
};

  async function toggleTitulaire(targetId, actuel) {
    if (verrouille) return;
    setSaving(true);
    const MAJParticipations = participations.map(x => x.id === targetId || x.contrat_id === targetId ? { ...x, is_titulaire: !actuel } : x);
    setParticipations(MAJParticipations);
    await synchroniserParticipations(MAJParticipations);
    setSaving(false);
  }

  async function togglePresence(targetId, actuel) {
    if (verrouille) return;
    setSaving(true);
    const MAJParticipations = participations.map(x => x.id === targetId || x.contrat_id === targetId ? { ...x, is_present: !actuel } : x);
    setParticipations(MAJParticipations);
    await synchroniserParticipations(MAJParticipations);
    setSaving(false);
  }

  async function toggleStaff(contratId, roleMatch) {
    const exist = staffing.find(s => s.contrat_id === contratId)
    setSaving(true)
    try {
      if (exist) {
        await api.delete(`/staffing-matchs/${exist.id}`)
        setStaffing(s => s.filter(x => x.contrat_id !== contratId))
      } else {
        const { data } = await api.post(`/evenements/${id}/staffing`, { contrat_id: contratId, role_match: roleMatch })
        setStaffing(s => [...s, data.staffing])
      }
    } catch (err) { alert(err.response?.data?.message ?? 'Erreur') }
    finally { setSaving(false) }
  }

  async function saveResultat(e) {
    e.preventDefault()
    setSaving(true)
    try {
      // ALIGNEMENT : On transmet la clé score_adversaire que Laravel attend
      await api.put(`/evenements/${id}`, {
        resultat:         resultatForm.resultat,
        statut:           'TERMINE',
        score_nous:       resultatForm.score_nous !== '' ? parseInt(resultatForm.score_nous) : null,
        score_adversaire: resultatForm.score_adversaire !== '' ? parseInt(resultatForm.score_adversaire) : null,
        observations:     resultatForm.observations,
      })
      setShowResultat(false)
      fetchEvt()
    } catch (err) { alert(err.response?.data?.message ?? 'Erreur lors de l\'enregistrement') }
    finally { setSaving(false) }
  }

  async function validerEvenement() {
    if (!window.confirm('Valider cet événement ? Les primes seront calculées et l\'événement sera verrouillé définitivement.')) return
    setSaving(true)
    try {
      // ALIGNEMENT : On envoie aussi score_adversaire lors de la clôture/validation automatique des primes
      await api.post(`/evenements/${id}/valider`, {
        resultat:         resultatForm.resultat,
        score_nous:       resultatForm.score_nous !== '' ? parseInt(resultatForm.score_nous) : null,
        score_adversaire:    resultatForm.score_adversaire !== '' ? parseInt(resultatForm.score_adversaire) : null,
        observations:     resultatForm.observations,
      })
      fetchEvt()
    } catch (err) { alert(err.response?.data?.message ?? 'Erreur lors de la validation.') }
    finally { setSaving(false) }
  }

 async function savePerformance(e) {
    e.preventDefault()
    
    // Formate les données sous forme de tableau d'objets { metrique, valeur }
    const statsPayload = Object.entries(perfForm)
      .filter(([, v]) => v !== '' && parseInt(v) > 0)
      .map(([metrique, valeur]) => ({
        metrique,
        valeur: parseInt(valeur, 10)
      }));

    if (!statsPayload.length) { setShowPerf(null); return }
    
    setSaving(true)
    
    const participationReelle = participations.find(x => Number(x.contrat_id) === Number(showPerf.contrat_id) || Number(x.id) === Number(showPerf.id));
    const participationId = participationReelle?.id;
    
    if (!participationId) {
      alert("⚠️ Veuillez d'abord aller dans l'onglet 'Appel' pour enregistrer la présence de ce joueur.");
      setSaving(false); return;
    }
    
    try {
      // Enregistre toutes les métriques en un seul appel POST
      await api.post(`/coach/participations/${participationId}/performances`, { 
        stats: statsPayload 
      });
      
      setShowPerf(null)
      fetchEvt() // Actualise les données de l'événement
    } catch (err) { 
      alert(err.response?.data?.message ?? 'Erreur lors de l\'enregistrement'); 
    } finally { 
      setSaving(false); 
    }
}

  async function saveSanction(e) {
    e.preventDefault()
    setSaving(true)
    const participationReelle = participations.find(x => Number(x.contrat_id) === Number(showSanc.contrat_id) || Number(x.id) === Number(showSanc.id));
    const participationId = participationReelle?.id;
    if (!participationId) {
      alert("⚠️ Veuillez d'abord aller dans l'onglet 'Appel' pour enregistrer la présence de ce joueur.");
      setSaving(false); return;
    }
    try {
      await api.post(`/coach/participations/${participationId}/sanctions`, { ...sancForm, minute_jeu: sancForm.minute_jeu ? parseInt(sancForm.minute_jeu) : null })
      setShowSanc(null)
      fetchEvt()
    } catch (err) { alert(err.response?.data?.message ?? 'Erreur lors de l\'enregistrement') }
    finally { setSaving(false) }
  }

  const convoquesIds = new Set(participations.map(p => p.contrat_id))
  const staffIds     = new Set(staffing.map(s => s.contrat_id))
  const joueurs      = membres.filter(m => m.contrats?.[0]?.type_role === 'JOUEUR')
  const staff        = membres.filter(m => ['COACH','STAFF','MEDECIN','INTENDANT'].includes(m.contrats?.[0]?.type_role))

  const titulaires   = participations.filter(p => p.is_titulaire)
  const remplacants  = participations.filter(p => !p.is_titulaire)
  const presents     = participations.filter(p => p.is_present)

  const tabs = [
    { key: 'composition', label: `Composition (${participations.length})`, icon: '👥' },
    { key: 'appel',       label: `Appel (${presents.length}/${participations.length})`, icon: '✅' },
    { key: 'staff',       label: `Staff (${staffing.length})`, icon: '🧑‍💼' },
    { key: 'performances',label: 'Performances', icon: '📊' },
    { key: 'sanctions',   label: 'Sanctions', icon: '🟨' },
    { key: 'resultat',    label: 'Résultat', icon: '🏆' },
  ]

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/evenements')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6b7280', fontFamily: 'Poppins, sans-serif', flexShrink: 0 }}>
          <ArrowLeft size={14} /> Retour
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>{type.icon}</span>
            <h1 style={{ fontFamily: 'Century Gothic, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              {isMatch ? (evt.adversaire ? `vs ${evt.adversaire}` : type.label) : `Entraînement — ${evt.section?.nom}`}
            </h1>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: type.bg, color: type.color, border: `1px solid ${type.border}`, fontWeight: 600 }}>{type.label}</span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: statut.bg, color: statut.color, border: `1px solid ${statut.border}`, fontWeight: 600 }}>{statut.label}</span>
            {resultat && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: resultat.bg, color: resultat.color, border: `1px solid ${resultat.border}`, fontWeight: 700 }}>
                {/* ALIGNEMENT : score_adversaire */}
                {resultat.label} {evt.score_nous !== null && evt.score_nous !== undefined ? `${evt.score_nous}–${evt.score_adversaire ?? 0}` : ''}
              </span>
            )}
            {verrouille && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={10} /> Verrouillé
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {evt.lieu && <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {evt.lieu}</span>}
            {console.log("OBJET COMPLET EVT :", evt)}

            {isMatch && <span style={{ fontSize: 12, color: '#6b7280' }}>{evt.domicile ? '🏠 Domicile' : '✈ Extérieur'}</span>}
            <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> {evt.section?.nom}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!verrouille && evt.statut !== 'TERMINE' && (
            <button onClick={() => setShowResultat(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4', fontSize: 13, color: '#059669', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>
              <Trophy size={14} /> Résultat
            </button>
          )}
          {!verrouille && evt.statut === 'TERMINE' && (
            <button onClick={validerEvenement} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 'none', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={14} />}
              Valider & Verrouiller
            </button>
          )}
          <button onClick={fetchEvt} style={{ padding: '9px 10px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {verrouille && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          <Lock size={15} style={{ flexShrink: 0 }} />
          <strong>Événement verrouillé (RG-SPT-02)</strong> — Les primes sont figées. Aucune modification possible.
          {evt.primes_calculees != null && <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{Number(evt.primes_calculees).toLocaleString('fr-FR')} FCFA distribués</span>}
        </div>
      )}

      {/* ── Onglets ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 18px', border: 'none', background: 'none', fontSize: 13, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? '#ed1f24' : '#6b7280', borderBottom: `2px solid ${tab === t.key ? '#ed1f24' : 'transparent'}`, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap', marginBottom: -1 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {tab === 'composition' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>⚡ Titulaires ({titulaires.length})</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   {titulaires.map(p => (
                     <JoueurCard 
                         key={p.id ?? p.contrat_id} 
                         participation={p} 
                         verrouille={verrouille} 
                         onToggleTitulaire={() => toggleTitulaire(p.id ?? p.contrat_id, true)} 
                         onTogglePresence={() => togglePresence(p.id ?? p.contrat_id, p.is_present)} 
                         onPerf={() => { setShowPerf(p); setPerfForm({}) }} 
                         onSanc={() => { setShowSanc(p); setSancForm({ type: 'JAUNE', motif: '', minute_jeu: '' }) }} 
                         onRetirer={() => toggleJoueur(p.contrat_id)} 
                         isTitulaire={true} 
                      />
                    ))}
                    {titulaires.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Aucun titulaire défini</p>}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>🔄 Remplaçants ({remplacants.length})</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {remplacants.map(p => (
                      <JoueurCard key={p.id ?? p.contrat_id} participation={p} verrouille={verrouille} onToggleTitulaire={() => toggleTitulaire(p.id ?? p.contrat_id, false)} onTogglePresence={() => togglePresence(p.id ?? p.contrat_id, p.is_present)} onPerf={() => { setShowPerf(p); setPerfForm({}) }} onSanc={() => { setShowSanc(p); setSancForm({ type: 'JAUNE', motif: '', minute_jeu: '' }) }} onRetirer={() => toggleJoueur(p.contrat_id)} isTitulaire={false} />
                    ))}
                    {remplacants.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Aucun remplaçant</p>}
                  </div>
                </div>
              </div>

              {!verrouille && (
                <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>+ Ajouter des joueurs à la composition</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {joueurs.filter(m => !convoquesIds.has(m.contrats?.[0]?.id)).map(m => {
                      const c = m.contrats?.[0]
                      const genreEvenement = evt?.section?.genre;
                      const genreCompatible = !genreEvenement || genreEvenement === 'MIXTE' || m.sexe === genreEvenement;
                      const eligible = c?.statut === 'ACTIF' && c?.documents_valides && c?.certificat_medical_valide && genreCompatible;

                      let errorTitle = 'Ajouter à la composition';
                      if (!genreCompatible) {
                        errorTitle = `RG-SPORT-02 : Incohérence de genre (Équipe ${genreEvenement === 'F' ? 'Féminine' : 'Masculine'} vs Profil ${m.sexe})`;
                      } else if (!eligible) {
                        errorTitle = 'RG-RH-01 : Documents manquants ou statut invalide';
                      }

                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1px solid ${eligible ? '#e8e8e8' : '#fecaca'}`, borderRadius: 9, background: eligible ? '#fff' : '#fef9f9', cursor: eligible ? 'pointer' : 'not-allowed', opacity: eligible ? 1 : 0.65 }} onClick={() => eligible && toggleJoueur(c?.id)} title={errorTitle}>
                          <Avatar photoUrl={m.photo_url} nom={m.nom} prenoms={m.prenoms} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.prenoms} {m.nom}</p>
                            <p style={{ fontSize: 10, color: '#9ca3af' }}>{c?.poste_cle ?? 'Poste ?'}{c?.numero_maillot ? ` · N°${c.numero_maillot}` : ''}{!genreCompatible && <span style={{ color: '#dc2626', fontWeight: 600 }}> ({m.sexe})</span>}</p>
                          </div>
                          {!eligible ? <AlertTriangle size={13} style={{ color: !genreCompatible ? '#dc2626' : '#f59e0b', flexShrink: 0 }} title={errorTitle} /> : <Plus size={13} style={{ color: '#059669', flexShrink: 0 }} />}
                        </div>
                      )
                    })}
                    {joueurs.filter(m => !convoquesIds.has(m.contrats?.[0]?.id)).length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', gridColumn: '1 / -1' }}>Tous les joueurs sont dans la composition</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'appel' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <CheckCircle size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>{presents.length} présents</span>
                </div>
                <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <XCircle size={16} style={{ color: '#dc2626' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{participations.length - presents.length} absents</span>
                </div>
                <div style={{ padding: '10px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 }}><span style={{ fontSize: 13, color: '#6b7280' }}>{participations.length} convoqués</span></div>
              </div>
              {participations.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>Définissez d'abord la composition dans l'onglet "Composition"</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {participations.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${p.is_present ? '#bbf7d0' : '#fecaca'}`, borderRadius: 9, background: p.is_present ? '#f0fdf4' : '#fef9f9', cursor: verrouille ? 'default' : 'pointer', transition: 'all 0.15s' }} onClick={() => !verrouille && togglePresence(p.id || p.contrat_id, p.is_present)}>
                      <Avatar photoUrl={p.contrat?.personne?.photo_url} nom={p.contrat?.personne?.nom} prenoms={p.contrat?.personne?.prenoms} size={36} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{p.contrat?.personne?.prenoms} {p.contrat?.personne?.nom}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{p.is_titulaire ? '⚡ Titulaire' : '🔄 Remplaçant'} {p.contrat?.poste_cle ? ` · ${p.contrat.poste_cle}` : ''}</p>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.is_present ? '#059669' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.is_present ? <CheckCircle size={15} style={{ color: '#fff' }} /> : <XCircle size={15} style={{ color: '#9ca3af' }} />}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'staff' && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Staff affecté à cet événement</h3>
              {staffing.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {staffing.map(s => {
                      const roleConf = ROLE_MATCH_CONFIG[s.role_match] ?? { label: s.role_match, emoji: '👤' }
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e8e8e8', borderRadius: 9, background: '#f9f9f9' }}>
                          <span style={{ fontSize: 20 }}>{roleConf.emoji}</span>
                          <Avatar photoUrl={s.contrat?.personne?.photo_url} nom={s.contrat?.personne?.nom} prenoms={s.contrat?.personne?.prenoms} size={36} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{s.contrat?.personne?.prenoms} {s.contrat?.personne?.nom}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{roleConf.label}</p>
                          </div>
                          {!verrouille && <button onClick={() => toggleStaff(s.contrat_id, s.role_match)} style={{ padding: '5px 8px', border: '1px solid #fecaca', borderRadius: 7, background: '#fef2f2', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><X size={13} /></button>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!verrouille && (
                <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4b5563' }}>Rôle de match à attribuer :</span>
                    <select value={selectedStaffRole} onChange={e => setSelectedStaffRole(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'Poppins' }}>
                      {Object.entries(ROLE_MATCH_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                    {staff.filter(m => !staffIds.has(m.contrats?.[0]?.id)).map(m => {
                      const c = m.contrats?.[0]
                      return (
                        <div key={m.id} onClick={() => toggleStaff(c.id, selectedStaffRole)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', border: '1px solid #e8e8e8', borderRadius: 9, background: '#fff', cursor: 'pointer' }}>
                          <Avatar photoUrl={m.photo_url} nom={m.nom} prenoms={m.prenoms} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.prenoms} {m.nom}</p>
                            <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{c.type_role}</p>
                          </div>
                          <Plus size={14} style={{ color: '#2563eb' }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

{tab === 'performances' && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Suivi des statistiques individuelles ({metriques.join(', ')})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {participations.map(p => (
                  <div key={p.contrat_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', border: '1px solid #e8e8e8', borderRadius: 10, background: '#fff' }}>
                    {/* 🛠 Correction des chemins d'accès aux données */}
                    <Avatar photoUrl={p.contrat?.personne?.photo_url} nom={p.contrat?.personne?.nom} prenoms={p.contrat?.personne?.prenoms} size={34} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                         {p.contrat?.personne?.prenoms} {p.contrat?.personne?.nom}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {p.performances?.map(perf => (
                          <span key={perf.id} style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 8px', borderRadius: 6, color: '#4b5563', fontWeight: 500 }}>{perf.metrique} : <strong>{perf.valeur}</strong></span>
                        )) ?? <span style={{ fontSize: 11, color: '#9ca3af' }}>Aucune donnée statistique</span>}
                      </div>
                    </div>
                    {!verrouille && <button onClick={() => { setShowPerf(p); setPerfForm({}) }} style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer' }}>+ Saisir</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'sanctions' && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Fautes et cartons distribués</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {participations.map(p => (
                  <div key={p.contrat_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', border: '1px solid #e8e8e8', borderRadius: 10, background: '#fff' }}>
                    {/* 🛠 Correction des chemins d'accès aux données */}
                    <Avatar photoUrl={p.contrat?.personne?.photo_url} nom={p.contrat?.personne?.nom} prenoms={p.contrat?.personne?.prenoms} size={34} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                         {p.contrat?.personne?.prenoms} {p.contrat?.personne?.nom}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {p.sanctions?.map(s => {
                          const conf = SANCTION_CONFIG[s.type] ?? { label: s.type, emoji: '⚠️' }
                          return <span key={s.id} style={{ fontSize: 11, background: '#fff5f5', border: '1px solid #fee2e2', padding: '2px 8px', borderRadius: 6, color: '#991b1b' }}>{conf.emoji} {conf.label} {s.minute_jeu ? `(${s.minute_jeu}')` : ''} — <small>{s.motif ?? 'Pas de motif'}</small></span>
                        }) ?? <span style={{ fontSize: 11, color: '#9ca3af' }}>Rien à signaler</span>}
                      </div>
                    </div>
                    {!verrouille && <button onClick={() => { setShowSanc(p); setSancForm({ type: 'JAUNE', motif: '', minute_jeu: '' }) }} style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#dc2626', cursor: 'pointer' }}>+ Sanctionner</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'resultat' && (
            <div style={{ background: '#fafafa', padding: 20, borderRadius: 10, border: '1px solid #e8e8e8' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0' }}>Bilan de la rencontre</h3>
              {evt.resultat ? (
                <div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 28 }}>{resultat?.label === 'Victoire' ? '🏆' : '⚽'}</div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: resultat?.color }}>{resultat?.label ?? 'Terminé'}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: '2px 0 0 0' }}>
                        {/* ALIGNEMENT : score_adversaire */}
                        Score final : {evt.score_nous ?? 0} — {evt.score_adversaire ?? 0}
                      </p>
                    </div>
                  </div>
                  {evt.observations && (
                    <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: 10, marginTop: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4b5563' }}>Observations :</span>
                      <p style={{ fontSize: 13, color: '#1a1a1a', margin: '4px 0 0 0', fontStyle: 'italic' }}>"{evt.observations}"</p>
                    </div>
                  )}
                  {!verrouille && (
                    <button onClick={() => setShowResultat(true)} style={{ marginTop: 14, padding: '7px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins' }}>Modifier le résultat</button>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Aucun résultat n'a encore été enregistré pour cet événement.</p>
                  {!verrouille && (
                    <button onClick={() => setShowResultat(true)} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins' }}>Saisir le score de fin</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL : RÉSULTAT ET SCORE ── */}
      {showResultat && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Saisie du résultat final</h2>
              <button onClick={() => setShowResultat(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>
            <form onSubmit={saveResultat} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Issue du match</label>
                <select value={resultatForm.resultat} onChange={e => setResultatForm({...resultatForm, resultat: e.target.value})} required style={inp}>
                  <option value="">-- Sélectionner --</option>
                  <option value="VICTOIRE">Victoire</option>
                  <option value="DEFAITE">Défaite</option>
                  <option value="NUL">Match Nul</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Notre Score</label>
                  <input type="number" min="0" value={resultatForm.score_nous} onChange={e => setResultatForm({...resultatForm, score_nous: e.target.value})} required style={inp} />
                </div>
                <div>
                  <label style={lbl}>Score Adversaire</label>
                  <input type="number" min="0" value={resultatForm.score_adversaire} onChange={e => setResultatForm({...resultatForm, score_adversaire: e.target.value})} required style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Observations / Résumé</label>
                <textarea rows="3" value={resultatForm.observations} onChange={e => setResultatForm({...resultatForm, observations: e.target.value})} style={{...inp, resize: 'none'}} placeholder="Notes de match..."></textarea>
              </div>
              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setShowResultat(false)} style={btnSec}>Annuler</button>
                <button type="submit" disabled={saving} style={btnPri}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : PERFORMANCE INDIVIDUELLE ── */}
      {showPerf && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Statistiques de {showPerf.contrat?.personne?.prenoms ?? 'Joueur'}</h2>
              <button onClick={() => setShowPerf(null)} style={closeBtnStyle}><X size={18} /></button>
            </div>
            <form onSubmit={savePerformance} style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0, marginBottom: 14 }}>Renseignez les métriques acquises lors de cet événement :</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
                {metriques.map(m => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.replace('_', ' ')}</span>
                    <input type="number" min="0" value={perfForm[m] ?? ''} onChange={e => setPerfForm({...perfForm, [m]: e.target.value})} style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', textAlign: 'center' }} placeholder="0" />
                  </div>
                ))}
              </div>
              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setShowPerf(null)} style={btnSec}>Annuler</button>
                <button type="submit" disabled={saving} style={btnPri}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : AJOUTER UNE SANCTION ── */}
      {showSanc && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Attribuer une sanction à {showSanc.contrat?.personne?.prenoms ?? 'Joueur'}</h2>
              <button onClick={() => setShowSanc(null)} style={closeBtnStyle}><X size={18} /></button>
            </div>
            <form onSubmit={saveSanction} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Type de sanction</label>
                <select value={sancForm.type} onChange={e => setSancForm({...sancForm, type: e.target.value})} style={inp}>
                  {Object.entries(SANCTION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Minute de jeu (optionnel)</label>
                <input type="number" min="1" max="120" value={sancForm.minute_jeu} onChange={e => setSancForm({...sancForm, minute_jeu: e.target.value})} style={inp} placeholder="Ex: 42" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Motif / Raison</label>
                <input type="text" value={sancForm.motif} onChange={e => setSancForm({...sancForm, motif: e.target.value})} required style={inp} placeholder="Ex: Contestation répétée" />
              </div>
              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setShowSanc(null)} style={btnSec}>Annuler</button>
                <button type="submit" disabled={saving} style={{...btnPri, background: '#dc2626'}}>Appliquer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 5, display: 'block' }
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Poppins, sans-serif', background: '#fafafa', boxSizing: 'border-box' }
const btnPri = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: 'none', borderRadius: 8, background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }
const btnSec = { padding: '9px 16px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#4b5563', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }
const modalStyle = { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }
const modalHeaderStyle = { padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const modalFooterStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 14, marginTop: 6 }
const closeBtnStyle = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4, display: 'flex' }