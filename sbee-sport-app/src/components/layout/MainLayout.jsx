import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenu principal décalé de la largeur de la sidebar */}
      <div style={{
        marginLeft: 250,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0,
      }} className="main-content">

        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main style={{
          flex: 1,
          padding: '28px 30px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <Outlet />
        </main>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  )
}
