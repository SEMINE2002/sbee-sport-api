import { useState, useEffect } from 'react'
import api from '@/services/authService'
import {
  Phone, Mail, MapPin, Ruler, Weight,
  Save, X, ChevronRight, ChevronLeft, Loader2, AlertCircle, Camera, FileText, CreditCard
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

const labelStyle = { fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }
const selectStyle = { padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Poppins, sans-serif' }
const btnPri = { display: 'flex', alignItems: 'center', gap: 8, background: '#ed1f24', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'Poppins, sans-serif' }
const btnSec = { display: 'flex', alignItems: 'center', gap: 8, background: '#f3f4f6', color: '#4b5563', border: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'Poppins, sans-serif' }

function InputField({ label, icon, error, textarea, ...props }) {
  const Tag = textarea ? 'textarea' : 'input'
  const msg = Array.isArray(error) ? error[0] : error
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icon && !textarea && (
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>{icon}</div>
        )}
        <Tag
          style={{
            width: '100%',
            padding: textarea ? '10px 12px' : `10px 12px 10px ${icon ? '34px' : '12px'}`,
            borderWidth: 1, borderStyle: 'solid',
            borderColor: msg ? '#ef4444' : '#e5e7eb',
            borderRadius: 8, fontSize: 13, outline: 'none',
            boxSizing: 'border-box', fontFamily: 'Poppins, sans-serif',
            background: '#fafafa',
            minHeight: textarea ? 80 : 'auto',
            resize: textarea ? 'vertical' : 'none',
          }}
          {...props}
        />
      </div>
      {msg && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{msg}</p>}
    </div>
  )
}

function SelectField({ label, error, children, ...props }) {
  const msg = Array.isArray(error) ? error[0] : error
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      <select style={{ ...selectStyle, borderColor: msg ? '#ef4444' : '#e5e7eb' }} {...props}>
        {children}
      </select>
      {msg && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{msg}</p>}
    </div>
  )
}

const STEPS = ['Identité', 'Contact & Physique', 'Contrat & Rôle']

function buildPhotoUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}/storage/${path}`
}

export default function AddMemberForm({ onOpenChange, onMemberAdded, member = null }) {
  const isEdit = !!member
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState([])
  const [saisons, setSaisons]   = useState([])
  const [errors, setErrors]     = useState({})
  const [globalError, setGlobalError] = useState('')

  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [certifFile, setCertifFile]   = useState(null)
  const [contratFile, setContratFile] = useState(null)

  const emptyForm = {
    nom: '', prenoms: '', sexe: 'M',
    date_naissance: '', lieu_naissance: '', nationalite: 'Béninoise',
    cni_numero: '', email: '', telephone: '', adresse: '',
    taille_cm: '', poids_kg: '', groupe_sanguin: '',
    allergies: '', antecedents_medicaux: '',
    section_id: '', saison_id: '',
    type_role: 'JOUEUR', poste_cle: '',
    numero_maillot: '', numero_licence: '', assurance_ref: '',
    salaire_fixe: '0', prime_signature: '0',
    mode_paiement: 'VIREMENT', statut: 'ACTIF',
    certificat_medical_valide: 'false',
    date_debut_contrat: new Date().toISOString().split('T')[0],
    date_fin_contrat: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  }

  const [form, setForm] = useState(emptyForm)

  // GESTION AUTOMATIQUE DE LA CASE À COCHER AU NIVEAU DE L'AJOUT
  useEffect(() => {
    if (!isEdit) {
      if (certifFile && contratFile) {
        setForm(f => ({ ...f, certificat_medical_valide: 'true' }))
      } else {
        setForm(f => ({ ...f, certificat_medical_valide: 'false' }))
      }
    }
  }, [certifFile, contratFile, isEdit])

  useEffect(() => {
    if (member) {
      const c = member.contrats?.[0] ?? {}
      setForm({
        nom:                member.nom                ?? '',
        prenoms:           member.prenoms            ?? '',
        sexe:               member.sexe               ?? 'M',
        date_naissance:    member.date_naissance     ? member.date_naissance.split('T')[0] : '',
        lieu_naissance:    member.lieu_naissance     ?? '',
        nationalite:       member.nationalite        ?? 'Béninoise',
        cni_numero:        member.cni_numero         ?? '',
        email:             member.email              ?? '',
        telephone:         member.telephone          ?? '',
        adresse:           member.adresse            ?? '',
        taille_cm:         member.taille_cm          ?? '',
        poids_kg:          member.poids_kg           ?? '',
        groupe_sanguin:    member.groupe_sanguin      ?? '',
        allergies:         member.allergies          ?? '',
        antecedents_medicaux: member.antecedents_medicaux ?? '',
        section_id:        c.section_id              ? String(c.section_id) : '',
        saison_id:         c.saison_id               ? String(c.saison_id)  : '',
        type_role:         c.type_role               ?? 'JOUEUR',
        poste_cle:         c.poste_cle               ?? '',
        numero_maillot:    c.numero_maillot           ? String(c.numero_maillot) : '',
        numero_licence:    c.numero_licence           ?? '',
        assurance_ref:     c.assurance_ref            ?? '',
        salaire_fixe:      c.salaire_fixe             ? String(c.salaire_fixe) : '0',
        prime_signature:   c.prime_signature          ? String(c.prime_signature) : '0',
        mode_paiement:     c.mode_paiement            ?? 'VIREMENT',
        statut:            c.statut                  ?? 'ACTIF',
        certificat_medical_valide: c.certificat_medical_valide ? 'true' : 'false',
        date_debut_contrat: c.date_debut_contrat ? c.date_debut_contrat.split('T')[0] : new Date().toISOString().split('T')[0],
        date_fin_contrat:   c.date_fin_contrat   ? c.date_fin_contrat.split('T')[0]   : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      })
      if (member.photo_url) {
        setPhotoPreview(buildPhotoUrl(member.photo_url))
      }
    }
  }, [member])

  useEffect(() => {
    api.get('/sections').then(({ data }) => setSections(data.sections ?? data.data ?? [])).catch(() => setSections([]))
    api.get('/saisons').then(({ data }) => {
      const list = data.saisons ?? data.data ?? []
      setSaisons(list)
      if (!isEdit) {
        const active = list.find(s => s.is_active)
        if (active) setForm(f => ({ ...f, saison_id: String(active.id) }))
      }
    }).catch(() => setSaisons([]))
  }, [isEdit])

  const isJoueur = form.type_role === 'JOUEUR'

  const set = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: undefined }))
  }

  const validateStep = (s) => {
    const errs = {}
    if (s === 1) {
      if (!form.nom.trim())      errs.nom     = 'Le nom est requis'
      if (!form.prenoms.trim()) errs.prenoms = 'Le prénom est requis'
    }
    if (s === 3) {
      if (!form.section_id) errs.section_id = 'Veuillez choisir une section'
      if (!isEdit && (!certifFile || !contratFile)) {
        setGlobalError('Le certificat médical et le contrat sont obligatoires.')
        setErrors(errs)
        return false
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = (e) => { 
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (validateStep(step)) setStep(s => s + 1) 
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault() 
    }
  }

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (step !== 3) return

    if (!validateStep(3)) return
    setLoading(true)
    setGlobalError('')

    try {
      const fd = new FormData()

      if (isEdit) {
        const payload = {
          nom: form.nom,
          prenoms: form.prenoms,
          sexe: form.sexe,
          date_naissance: form.date_naissance || null,
          lieu_naissance: form.lieu_naissance || null,
          nationalite: form.nationalite || null,
          cni_numero: form.cni_numero || null,
          email: form.email || null,
          telephone: form.telephone || null,
          adresse: form.adresse || null,
          taille_cm: form.taille_cm ? parseFloat(form.taille_cm) : null,
          poids_kg: form.poids_kg ? parseFloat(form.poids_kg) : null,
          groupe_sanguin: form.groupe_sanguin || null,
          allergies: form.allergies || null,
          antecedents_medicaux: form.antecedents_medicaux || null,
          section_id: Number(form.section_id) || null,
          saison_id: Number(form.saison_id) || null,
          type_role: form.type_role,
          poste_cle: form.poste_cle || null,
          numero_maillot: form.numero_maillot ? Number(form.numero_maillot) : null,
          numero_licence: form.numero_licence || null,
          assurance_ref: form.assurance_ref || null,
          salaire_fixe: parseFloat(form.salaire_fixe) || 0,
          prime_signature: parseFloat(form.prime_signature) || 0,
          mode_paiement: form.mode_paiement,
          statut: form.statut,
          certificat_medical_valide: form.certificat_medical_valide === 'true' ? '1' : '0',
          date_debut_contrat: form.date_debut_contrat,
          date_fin_contrat: form.date_fin_contrat,
        }

        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) fd.append(key, value)
        })

        if (photoFile) fd.append('photo_url', photoFile)
        if (certifFile) fd.append('certificat_fichier', certifFile)
        if (contratFile) fd.append('contrat_fichier', contratFile)

        fd.append('_method', 'PUT')

        await api.post(`/personnes/${member.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

      } else {
        const champs = [
          'nom','prenoms','sexe','date_naissance','lieu_naissance','nationalite',
          'cni_numero','telephone','adresse','allergies','antecedents_medicaux',
          'groupe_sanguin','type_role','poste_cle','numero_licence','assurance_ref',
          'mode_paiement','statut','date_debut_contrat','date_fin_contrat',
          'taille_cm', 'poids_kg'
        ]
        champs.forEach(k => { if (form[k]) fd.append(k, form[k]) })

        fd.append('section_id', parseInt(form.section_id))
        fd.append('saison_id', parseInt(form.saison_id))
        fd.append('salaire_fixe', parseFloat(form.salaire_fixe) || 0)
        fd.append('prime_signature', parseFloat(form.prime_signature) || 0)
        fd.append('certificat_medical_valide', form.certificat_medical_valide === 'true' ? '1' : '0')
        fd.append('documents_valides', '1')

        if (isJoueur && form.numero_maillot) fd.append('numero_maillot', parseInt(form.numero_maillot))
        if (photoFile) fd.append('photo_url', photoFile)
        if (certifFile) fd.append('certificat_fichier', certifFile)
        if (contratFile) fd.append('contrat_fichier', contratFile)

        await api.post('/personnes', fd, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        })
      }

      if (onMemberAdded) await onMemberAdded()
      onOpenChange(false)

    } catch (err) {
      if (err.response?.status === 422) {
        const apiErrors = err.response.data.errors ?? {}
        setErrors(apiErrors)
        setGlobalError('Corrigez les erreurs indiquées.')
        const keys = Object.keys(apiErrors)
        if (keys.some(k => ['nom','prenoms','sexe','cni_numero'].includes(k))) setStep(1)
        else if (keys.some(k => ['telephone','taille_cm','poids_kg'].includes(k))) setStep(2)
        else setStep(3)
      } else {
        setGlobalError(err.response?.data?.message || 'Erreur serveur.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 660, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>

      <div style={{ padding: '24px 28px 16px', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#111827', margin: 0 }}>
              {isEdit ? 'Modifier le membre' : 'Nouveau Membre'}
            </h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Étape {step} sur 3 : {STEPS[step - 1]}</p>
          </div>
          <button type="button" onClick={() => onOpenChange(false)}
            style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 5, borderRadius: 10, background: step >= s ? '#ed1f24' : '#f3f4f6', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} style={{ padding: '24px 28px' }}>

        {globalError && (
          <div style={{ padding: '12px', background: '#fef2f2', borderLeft: '4px solid #ed1f24', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {globalError}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InputField label="Nom *" name="nom" value={form.nom} onChange={set} error={errors.nom} />
            <InputField label="Prénoms *" name="prenoms" value={form.prenoms} onChange={set} error={errors.prenoms} />
            <SelectField label="Sexe *" name="sexe" value={form.sexe} onChange={set}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </SelectField>
            <InputField label="Date de naissance" name="date_naissance" type="date" value={form.date_naissance} onChange={set} />
            <InputField label="Lieu de naissance" name="lieu_naissance" value={form.lieu_naissance} onChange={set} />
            <InputField label="Nationalité" name="nationalite" value={form.nationalite} onChange={set} />
            <InputField label="Numéro CNI" name="cni_numero" value={form.cni_numero} onChange={set}  error={errors.cni_numero} />
            <SelectField label="Groupe Sanguin" name="groupe_sanguin" value={form.groupe_sanguin} onChange={set}>
              <option value="">Non renseigné</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </SelectField>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Photo de profil</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', border: '2px dashed #e5e7eb', borderRadius: 12, background: '#fafafa', cursor: 'pointer' }}>
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }} />
                  : <div style={{ width: 50, height: 50, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={24} /></div>
                }
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{photoFile ? photoFile.name : isEdit ? 'Changer la photo' : 'Choisir une photo'}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>JPG, PNG — max 2 Mo</p>
                </div>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }
                }} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InputField label="Téléphone" name="telephone" value={form.telephone} onChange={set}  error={errors.telephone} />
            <InputField label="Email" name="email" type="email" value={form.email} onChange={set}  />
            <div style={{ gridColumn: 'span 2' }}>
              <InputField label="Adresse" name="adresse" value={form.adresse} onChange={set}  />
            </div>
            <InputField label="Taille (cm)" name="taille_cm" type="number" value={form.taille_cm} onChange={set}  error={errors.taille_cm} />
            <InputField label="Poids (kg)" name="poids_kg" type="number" value={form.poids_kg} onChange={set}  error={errors.poids_kg} />
            <InputField label="Allergies" name="allergies" value={form.allergies} onChange={set} />
            <div style={{ gridColumn: 'span 2' }}>
              <InputField textarea label="Antécédents médicaux" name="antecedents_medicaux" value={form.antecedents_medicaux} onChange={set} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SelectField label="Section *" name="section_id" value={form.section_id} onChange={set} error={errors.section_id}>
              <option value="">Sélectionner...</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </SelectField>
            <SelectField label="Saison *" name="saison_id" value={form.saison_id} onChange={set}>
              <option value="">Sélectionner...</option>
              {saisons.map(s => <option key={s.id} value={s.id}>{s.nom}{s.is_active ? ' ✓' : ''}</option>)}
            </SelectField>
            <SelectField label="Rôle *" name="type_role" value={form.type_role} onChange={set}>
              <option value="JOUEUR">Joueur</option>
              <option value="COACH">Coach</option>
              <option value="STAFF">Staff technique</option>
              <option value="MEDECIN">Médecin</option>
              <option value="INTENDANT">Intendant</option>
            </SelectField>
            <SelectField label="Statut" name="statut" value={form.statut} onChange={set}>
              <option value="ACTIF">Actif</option>
              <option value="BLESSE">Blessé</option>
              <option value="SUSPENDU">Suspendu</option>
            </SelectField>
            <InputField label={isJoueur ? 'Poste sur terrain' : 'Fonction'} name="poste_cle" value={form.poste_cle} onChange={set} />
            {isJoueur && <InputField label="N° Maillot" name="numero_maillot" type="number" value={form.numero_maillot} onChange={set} error={errors.numero_maillot} />}
           
            <InputField label="Réf. Assurance" name="assurance_ref" value={form.assurance_ref} onChange={set} />
            <InputField label="Salaire fixe (FCFA)" name="salaire_fixe" type="number" value={form.salaire_fixe} onChange={set} />
            <InputField label="Prime signature (FCFA)" name="prime_signature" type="number" value={form.prime_signature} onChange={set} />
            <InputField label="Début contrat *" name="date_debut_contrat" type="date" value={form.date_debut_contrat} onChange={set} error={errors.date_debut_contrat} />
            <InputField label="Fin contrat *" name="date_fin_contrat" type="date" value={form.date_fin_contrat} onChange={set} error={errors.date_fin_contrat} />

            <div>
              <label style={labelStyle}>Certificat Médical {isEdit ? '(Optionnel)' : '*'}</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: `1px solid ${certifFile ? '#ed1f24' : '#e5e7eb'}`, borderRadius: 8, background: '#fafafa', cursor: 'pointer' }}>
                <FileText size={16} style={{ color: certifFile ? '#ed1f24' : '#9ca3af', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: certifFile ? '#1a1a1a' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {certifFile ? certifFile.name : isEdit ? 'Remplacer le PDF...' : 'Joindre le PDF...'}
                </span>
                <input type="file" accept=".pdf,image/*" onChange={e => setCertifFile(e.target.files[0])} style={{ display: 'none' }} />
              </label>
            </div>
            <div>
              <label style={labelStyle}>Contrat signé {isEdit ? '(Optionnel)' : '*'}</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: `1px solid ${contratFile ? '#ed1f24' : '#e5e7eb'}`, borderRadius: 8, background: '#fafafa', cursor: 'pointer' }}>
                <FileText size={16} style={{ color: contratFile ? '#ed1f24' : '#9ca3af', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: contratFile ? '#1a1a1a' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contratFile ? contratFile.name : isEdit ? 'Remplacer le PDF...' : 'Joindre le PDF...'}
                </span>
                <input type="file" accept=".pdf" onChange={e => setContratFile(e.target.files[0])} style={{ display: 'none' }} />
              </label>
            </div>

            {/* CASE À COCHER COMPORTEMENT SÉCURISÉ : Contrôle total à la modification, automatique à l'ajout */}
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', opacity: (!isEdit && (!certifFile || !contratFile)) ? 0.65 : 1 }}>
              <input type="checkbox"
                disabled={!isEdit}
                checked={form.certificat_medical_valide === 'true'}
                onChange={e => {
                  if (isEdit) {
                    setForm(f => ({ ...f, certificat_medical_valide: e.target.checked ? 'true' : 'false' }))
                  }
                }}
                style={{ width: 18, height: 18, accentColor: '#ed1f24', cursor: isEdit ? 'pointer' : 'not-allowed' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Certificat médical certifié valide {!isEdit && <span style={{ fontSize: 11, color: '#ed1f24', fontWeight: 500 }}> (Géré automatiquement par les 2 fichiers)</span>}
              </span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
          <button 
            type="button" 
            onClick={(e) => { e.preventDefault(); step > 1 ? setStep(s => s - 1) : onOpenChange(false) }} 
            style={btnSec}
          >
            {step > 1 ? <><ChevronLeft size={16} /> Retour</> : 'Annuler'}
          </button>
          
          {step === 1 && (
            <button type="button" onClick={nextStep} style={btnPri}>
              Continuer <ChevronRight size={16} />
            </button>
          )}

          {step === 2 && (
            <button type="button" onClick={nextStep} style={btnPri}>
              Continuer <ChevronRight size={16} />
            </button>
          )}

          {step === 3 && (
            <button 
              type="submit" 
              disabled={loading} 
              style={{ ...btnPri, opacity: loading ? 0.7 : 1 }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Traitement...</>
                : <><Save size={16} /> {isEdit ? 'Mettre à jour' : 'Enregistrer'}</>
              }
            </button>
          )}
        </div>
      </form>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}