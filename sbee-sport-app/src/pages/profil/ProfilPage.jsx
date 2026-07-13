import { Loader2, AlertCircle, Download, FileText, Activity, ShieldCheck } from 'lucide-react'

export default function ProfilPage() {
  // ... (votre logique React Query reste identique)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      
      {/* HEADER PROFIL : Style "Cover & Identity" */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <img src={profile.avatar} className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover" />
          <div className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full border-4 border-white">
            <ShieldCheck size={16} />
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900">{profile.nom}</h1>
          <p className="text-gray-500 font-medium">{profile.poste} • <span className="text-red-600">{profile.matricule}</span></p>
          <div className="mt-4 flex gap-2 justify-center md:justify-start">
             <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase">{profile.statut}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNE GAUCHE (Performance) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="text-red-600" /> Performance Sportive
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <StatItem label="Matchs" value={profile.stats.matchs} />
              <StatItem label="Buts" value={profile.stats.buts} />
              <StatItem label="Taux de présence" value={`${profile.stats.presence}%`} />
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (Finance + Actions) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-t-4 border-t-red-600">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Revenus cumulés (YTD)</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">{profile.finance.montant}</h2>
            <button className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition">
              <Download size={18} /> Télécharger Relevé
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatItem = ({ label, value }) => (
  <div className="bg-gray-50 p-4 rounded-2xl text-center">
    <p className="text-xs text-gray-500 uppercase">{label}</p>
    <p className="text-xl font-bold text-red-600 mt-1">{value}</p>
  </div>
)