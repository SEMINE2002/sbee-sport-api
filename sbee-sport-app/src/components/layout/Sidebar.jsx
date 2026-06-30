import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Calendar,
  Wallet, Receipt, Package, Truck, LogOut, Home,
  Layers, History, Activity, Award, CheckCircle, BarChart3, Stethoscope
} from 'lucide-react'
import useAuthStore from '@/store/authStore'

// ── CONFIGURATION COMPLÈTE DES MENUS PAR RÔLE ──
const MENUS = {
  SUPER_ADMIN: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Ressources Humaines', items: [
      { to: '/personnes', icon: Users, label: 'Gestion Joueurs' },
      { to: '/contrats', icon: FileText, label: 'Contrats' },
    ]},
    { section: 'Structure', items: [
      { to: '/discipline', icon: Layers, label: 'Disciplines & Sections' },
      { to: '/saisons', icon: History, label: 'Saisons' },
    ]},
    { section: 'Activité', items: [{ to: '/evenements', icon: Calendar, label: 'Calendrier' }] },
    { section: 'Finance', items: [
      { to: '/budgets', icon: Wallet, label: 'Budgets' },
      { to: '/transactions', icon: Receipt, label: 'Transactions' },
    ]},
    { section: 'Inventaire', items: [
      { to: '/stocks', icon: Package, label: 'Stocks' },
      { to: '/dotations', icon: Truck, label: 'Dotations' },
    ]},
    { section: 'Pilotage', items: [{ to: '/rapports', icon: BarChart3, label: 'Rapports' }] },
  ],
  TRESORIER: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Finances', items: [
      { to: '/budgets', icon: Wallet, label: 'Budgets' },
      { to: '/transactions', icon: Receipt, label: 'Transactions' },
    ]},
    { section: 'Pilotage', items: [{ to: '/rapports', icon: BarChart3, label: 'Rapports Financiers' }] },
  ],
  RESPONSABLE_SECTION: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Ma Section', items: [
      { to: '/personnes', icon: Users, label: 'Mon Effectif' },
      { to: '/contrats', icon: FileText, label: 'Contrats Section' },
      { to: '/evenements', icon: Calendar, label: 'Matchs & Entraînements' },
    ]},
  ],
  COACH: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Suivi Sportif', items: [
      { to: '/presences', icon: CheckCircle, label: 'Présences' },
      { to: '/performances', icon: Activity, label: 'Performances' },
      { to: '/sanctions', icon: Award, label: 'Sanctions' },
      { to: '/evenements', icon: Calendar, label: 'Calendrier' },
    ]},
  ],
  MEDECIN: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Santé', items: [
      { to: '/medical/dossiers', icon: Stethoscope, label: 'Dossiers Médicaux' },
      { to: '/medical/suivi', icon: Activity, label: 'Consultations' },
    ]}
  ],
  JOUEUR: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Personnel', items: [
      { to: '/mon-planning', icon: Calendar, label: 'Mon Planning' },
      { to: '/mes-infos', icon: FileText, label: 'Mes Informations' }
    ]}
  ],
  SPONSOR: [
    { section: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' }] },
    { section: 'Consultation', items: [
      { to: '/rapports', icon: BarChart3, label: 'Tableau de bord Global' }
    ]}
  ]
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  // Sécurité : Rôle par défaut 'JOUEUR' si aucun rôle trouvé
  const role = user?.role_systeme ?? 'JOUEUR'
  const menus = MENUS[role] || MENUS.JOUEUR

  return (
    <aside className={`sidebar-aside ${isOpen ? 'sidebar-open' : ''}`} style={{
      position: 'fixed', top: 0, left: 0, width: 250, height: '100vh',
      background: '#fff', borderRight: '1px solid #e8e8e8',
      display: 'flex', flexDirection: 'column', zIndex: 40,
      transition: 'transform 0.25s ease', fontFamily: '"Poppins", sans-serif',
      overflowX: 'hidden'
    }}>

      <div style={{ padding: '20px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
        <img src="/logo.svg" alt="SBEE" style={{ height: '60px', width: '100%', maxWidth: '180px', objectFit: 'contain' }} />
      </div>

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

      <div style={{ borderTop: '1px solid #f0f0f0', background: '#fcfcfc', paddingBottom: '10px' }}>
        <button 
          onClick={async () => { await logout(); navigate('/login'); }} 
          className="nav-item nav-danger"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: '600' }}>Déconnexion</span>
        </button>
      </div>

      <style>{`
        .section-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding: 15px 20px 5px; letter-spacing: 0.5px; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: #4b5563; text-decoration: none; font-size: 13.5px; transition: all 0.2s ease; border-left: 3px solid transparent; }
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