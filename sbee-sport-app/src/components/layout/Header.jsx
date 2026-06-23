import { Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="main-header">
      <div className="header-left">
        <button className="mobile-btn" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <div className="breadcrumb">
          <span className="root">SBEE SPORT</span>
          <span className="separator">/</span>
          <span className="current-page">Tableau de bord</span>
        </div>
      </div>

      <div className="header-right">
        <button className="notif-btn">
          <Bell size={20} />
          <span className="notif-badge"></span>
        </button>

        <div className="user-profile" onClick={() => setIsOpen(!isOpen)} ref={menuRef}>
          <div className="avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Administrateur'}</span>
            <span className="user-role">{user?.role_systeme || 'Super Admin'}</span>
          </div>
          <ChevronDown size={16} className={`arrow ${isOpen ? 'rotate' : ''}`} />

          {isOpen && (
            <div className="profile-dropdown">
              <Link to="/profil" className="dropdown-item">
                <User size={16} /> Mon Profil
              </Link>
              <button onClick={handleLogout} className="dropdown-item text-danger">
                <LogOut size={16} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .main-header {
          height: 70px; background: #fff; border-bottom: 1px solid #f0f0f0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 30px; sticky top: 0; z-index: 30;
        }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .breadcrumb .root { color: #b0b0b0; font-weight: 600; }
        .breadcrumb .current-page { color: #1a1a1a; font-weight: 700; }
        .header-right { display: flex; align-items: center; gap: 25px; }
        .notif-btn { 
          background: none; border: none; color: #666; cursor: pointer; position: relative; 
          padding: 8px; border-radius: 50%; transition: background 0.2s;
        }
        .notif-btn:hover { background: #f5f5f5; }
        .notif-badge {
          position: absolute; top: 8px; right: 8px; width: 8px; height: 8px;
          background: #ed1f24; border: 2px solid #fff; border-radius: 50%;
        }
        .user-profile { display: flex; align-items: center; gap: 12px; cursor: pointer; position: relative; }
        .avatar {
          width: 38px; height: 38px; background: #ed1f24; color: #fff;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px; font-weight: 700;
        }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-size: 14px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
        .user-role { font-size: 11px; color: #999; font-weight: 600; }
        .profile-dropdown {
          position: absolute; top: 50px; right: 0; width: 180px;
          background: #fff; border: 1px solid #eee; border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 8px;
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px; padding: 10px;
          font-size: 13px; color: #444; text-decoration: none; border-radius: 8px;
        }
        .dropdown-item:hover { background: #f9f9f9; }
        .text-danger { color: #ed1f24 !important; border: none; background: none; width: 100%; cursor: pointer; }
        @media (min-width: 769px) { .mobile-btn { display: none; } }
      `}</style>
    </header>
  )
}