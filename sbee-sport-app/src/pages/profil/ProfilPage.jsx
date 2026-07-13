import { Loader2, AlertCircle, Download, Activity, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query'; // Assurez-vous d'avoir ceci
import { fetchUserProfile } from './api'; // Ajustez selon votre chemin d'import

export default function ProfilPage({ userId }) {
  
  // Requête API avec gestion des états
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId, // Ne lance la requête que si userId existe
  });

  // 1. État de chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  // 2. État d'erreur
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-600">
        <AlertCircle size={24} className="mr-2" />
        <p>Erreur lors du chargement du profil.</p>
      </div>
    );
  }

  // 3. Protection finale (si profile est null/undefined)
  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER PROFIL */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center overflow-hidden">
            <span className="text-4xl text-gray-400 font-bold">{profile.nom?.charAt(0)}</span>
          </div>
          <div className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full border-4 border-white">
            <ShieldCheck size={16} />
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900">{profile.nom}</h1>
          <p className="text-gray-500 font-medium">
            {profile.poste} • <span className="text-red-600 font-bold">{profile.matricule}</span>
          </p>
          <div className="mt-4 flex gap-2 justify-center md:justify-start">
             <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase">
               {profile.statut}
             </span>
          </div>
        </div>
      </div>

      {/* GRILLE DE DONNÉES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="text-red-600" /> Performance Sportive
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <StatItem label="Matchs" value={profile.stats?.matchs ?? 0} />
              <StatItem label="Buts" value={profile.stats?.buts ?? 0} />
              <StatItem label="Présence" value={`${profile.stats?.presence ?? 0}%`} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-t-4 border-t-red-600">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Revenus cumulés</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{profile.finance?.montant ?? '0 FCFA'}</h2>
            <button className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition">
              <Download size={18} /> Télécharger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant utilitaire pour les cartes de stats
const StatItem = ({ label, value }) => (
  <div className="bg-gray-50 p-4 rounded-2xl text-center">
    <p className="text-xs text-gray-500 uppercase">{label}</p>
    <p className="text-xl font-bold text-red-600 mt-1">{value}</p>
  </div>
);