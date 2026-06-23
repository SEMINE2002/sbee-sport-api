import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AccesRefusePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#fef2f2] flex items-center justify-center mb-4">
        <ShieldX size={28} className="text-[#ef4444]" />
      </div>
      <h1 className="text-[20px] font-semibold text-[#1e293b] mb-2">Accès refusé</h1>
      <p className="text-[14px] text-[#94a3b8] mb-6 max-w-sm">
        Vous n'avez pas les droits nécessaires pour accéder à cette page.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Retour au tableau de bord
      </Link>
    </div>
  )
}
