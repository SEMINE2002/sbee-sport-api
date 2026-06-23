import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-[80px] font-bold text-[#ede8e8] leading-none">404</p>
      <h1 className="text-[20px] font-semibold text-[#1e293b] mb-2 mt-2">Page introuvable</h1>
      <p className="text-[14px] text-[#94a3b8] mb-6">Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/dashboard" className="btn btn-primary">
        Retour au tableau de bord
      </Link>
    </div>
  )
}
