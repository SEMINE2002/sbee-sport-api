import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Calendar,
  Wallet, Receipt, Package, Truck, LogOut, Home,
  Layers, History, Activity, Award, CheckCircle, TrendingUp,
  BarChart3
} from 'lucide-react'
import useAuthStore from '@/store/authStore'

// ── CONFIGURATION DES MENUS PAR RÔLE ──
const MENUS = {
  SUPER_ADMIN: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Ressources Humaines', items: [
      { to: '/personnes', icon: Users,    label: 'Gestion Joueurs' },
      { to: '/contrats',  icon: FileText,  label: 'Contrats' },
    ]},
    { section: 'Structure du Club', items: [
      { to: '/discipline', icon: Layers,  label: 'Disciplines & Sections' },
      { to: '/saisons',    icon: History, label: 'Saisons' },
    ]},
    { section: 'Activité Sportive', items: [{ to: '/evenements', icon: Calendar, label: 'Calendrier' }] },
    { section: 'Finance', items: [
      { to: '/budgets',      icon: Wallet,  label: 'Budgets' },
      { to: '/transactions', icon: Receipt, label: 'Transactions' },
    ]},
    { section: 'Inventaire', items: [
      { to: '/stocks',    icon: Package, label: 'Stocks' },
      { to: '/dotations', icon: Truck,   label: 'Dotations' },
    ]},
    { section: 'Pilotage', items: [
      { to: '/rapports', icon: BarChart3, label: 'Rapports & Pilotage' },
    ]},
  ],
  TRESORIER: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Suivi Financier', items: [
      { to: '/budgets',      icon: Wallet,  label: 'Budgets Sections' },
      { to: '/transactions', icon: Receipt, label: 'Validation Transactions' },
    ]},
    { section: 'Archives', items: [
      { to: '/saisons',    icon: History, label: 'Historique Saisons' },
    ]},
    { section: 'Pilotage', items: [
      { to: '/rapports', icon: BarChart3, label: 'Rapports & Pilotage' },
    ]},
  ],
  // ... (Autres rôles identiques à votre configuration initiale)
  RESPONSABLE_SECTION: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Ma Section Sportive', items: [
      { to: '/personnes', icon: Users,    label: 'Effectif Joueurs' },
      { to: '/contrats',  icon: FileText,  label: 'Contrats Section' },
    ]},
    { section: 'Planification', items: [{ to: '/evenements', icon: Calendar, label: 'Matchs & Entraînements' }] },
    { section: 'Comptabilité', items: [
      { to: '/budgets',      icon: Wallet,  label: 'Mon Budget Alloué' },
      { to: '/transactions', icon: Receipt, label: 'Demandes de Fonds' },
    ]}
  ]
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  const role = user?.role_systeme ?? 'SUPER_ADMIN'
  const menus = MENUS[role] || MENUS.SUPER_ADMIN

  return (
    <aside className={`sidebar-aside ${isOpen ? 'sidebar-open' : ''}`} style={{
      position: 'fixed', top: 0, left: 0,
      width: 250, height: '100vh',
      background: '#fff',
      borderRight: '1px solid #e8e8e8',
      display: 'flex', flexDirection: 'column',
      zIndex: 40,
      transition: 'transform 0.25s ease',
      fontFamily: '"Poppins", sans-serif',
      overflowX: 'hidden'
    }}>

      {/* 1. LOGO SBEE (Corrigé pour éviter le débordement) */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #f5f5f5', 
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <img 
          src="/logo.svg" 
          alt="SBEE" 
          style={{ 
            height: '60px',
            width: '100%',
            maxWidth: '180px',
            objectFit: 'contain',
            display: 'block' 
          }} 
        />
      </div>

      {/* 2. NAVIGATION DYNAMIQUE */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {menus.map((group, gi) => (
          <div key={gi}>
            {group.section && <p className="section-title">{group.section}</p>}
            {group.items.map(item => {
              const IconComponent = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <IconComponent size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 3. BAS DE SIDEBAR */}
      <div style={{ borderTop: '1px solid #f0f0f0', background: '#fcfcfc' }}>
        <NavLink
          to="/"
          onClick={onClose}
          className="nav-item"
          style={{ margin: '8px 8px 0', borderRadius: '6px' }}
        >
          <Home size={18} strokeWidth={1.8} />
          <span>Retour à l'accueil</span>
        </NavLink>

        <button 
          onClick={async () => { await logout(); navigate('/login'); }} 
          className="nav-item nav-danger"
          style={{ width: 'calc(100% - 16px)', margin: '8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px' }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: '600' }}>Déconnexion</span>
        </button>
      </div>

      <style>{`
        .section-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding: 15px 20px 5px; letter-spacing: 0.5px; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 20px; color: #4b5563; text-decoration: none; font-size: 13.5px; transition: all 0.2s ease; border-left: 3px solid transparent; }
        .nav-item:hover { background: #f9fafb; color: #ed1f24; }
        .nav-active { background: #fef2f2 !important; color: #ed1f24 !important; font-weight: 600; border-left: 3px solid #ed1f24 !important; }
        .nav-danger { color: #dc2626 !important; }
        .nav-danger:hover { background: #fef2f2 !important; }
        @media (max-width: 768px) {
          .sidebar-aside { transform: translateX(-100%); }
          .sidebar-open { transform: translateX(0); }
        }
      `}</style>
    </aside>
  )
}