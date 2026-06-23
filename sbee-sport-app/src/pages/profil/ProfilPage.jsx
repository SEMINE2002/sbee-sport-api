import { useQuery } from '@tanstack/react-query'
import useAuthStore from '@/store/authStore'
import { Loader2, AlertCircle } from 'lucide-react'

// Simulation d'une fonction API pour récupérer les stats complètes
const fetchUserProfile = async (userId) => {
  const response = await fetch(`/api/users/${userId}/profile`);
  if (!response.ok) throw new Error('Erreur de chargement');
  return response.json();
}

export default function ProfilPage() {
  const { user } = useAuthStore()
  
  // Utilisation de React Query pour une gestion propre des données
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchUserProfile(user.id),
    enabled: !!user?.id
  })

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="spin" size={32} /></div>
  if (error) return <div className="alert-error"><AlertCircle /> Impossible de charger votre profil.</div>

  return (
    <div className="page-content fade-in">
      {/* Header Profile - Utilisation des classes CSS existantes */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <img src={profile.avatar} alt={profile.nom} style={{ width: '90px', height: '90px', borderRadius: '12px', objectFit: 'cover' }} />
        <div>
          <h1 className="page-title">{profile.nom}</h1>
          <p className="page-subtitle">{profile.poste} • {profile.matricule}</p>
          <div className="badge badge-green" style={{ marginTop: '8px' }}>{profile.statut}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Performances & Documents */}
        <div className="col">
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Sports Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <StatItem label="Matchs" value={profile.stats.matchs} />
              <StatItem label="Buts" value={profile.stats.buts} />
              <StatItem label="Taux" value={`${profile.stats.presence}%`} />
            </div>
          </div>
          
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Documents Numérisés</h3>
            {profile.documents.map((doc, i) => (
              <DocumentRow key={i} title={doc.nom} status={doc.etat} />
            ))}
          </div>
        </div>

        {/* Finance Sidebar */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Financial Overview</h3>
          <div className="stat-card" style={{ textAlign: 'center', padding: '20px' }}>
            <p className="page-subtitle">REVENUS (YTD)</p>
            <h1 style={{ color: 'var(--red)' }}>{profile.finance.montant}</h1>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: '20px' }}>
            Download Statement
          </button>
        </div>
      </div>
    </div>
  )
}

// Composants utilitaires locaux pour la lisibilité
const StatItem = ({ label, value }) => (
  <div className="stat-card">
    <p className="page-subtitle">{label}</p>
    <h2 style={{ color: 'var(--red)', marginTop: '5px' }}>{value}</h2>
  </div>
)

const DocumentRow = ({ title, status }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
    <span>{title}</span>
    <span className={`badge ${status === 'VALIDÉ' ? 'badge-blue' : 'badge-yellow'}`}>{status}</span>
  </div>
)