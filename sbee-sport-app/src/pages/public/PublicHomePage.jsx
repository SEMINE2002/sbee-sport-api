import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import useAuthStore from '@/store/authStore'
import {
  Heart, MessageCircle, Share2, Send, Image, Video,
  X, ChevronDown, Trophy, Users, Calendar, Star,
  Play, Plus, LogIn, Loader2, MoreHorizontal,
  ThumbsUp, Eye, Globe, Lock,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000'
const api = axios.create({ baseURL: `${API_BASE}/api/public` })

// Instance Axios pour les requêtes authentifiées (Membres / Administration)
const apiAuth = axios.create({ baseURL: `${API_BASE}/api` })
apiAuth.interceptors.request.use(config => {
  const token = localStorage.getItem('sbee_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Helpers ──
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return `il y a ${diff}s`
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800)return `il y a ${Math.floor(diff / 86400)}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ══════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════
export default function PublicHomePage() {
  console.log("Composant chargé");
  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]             = useState(1)
  const [hasMore, setHasMore]       = useState(true)
  const [stats, setStats]           = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const observerRef = useRef(null)
  const bottomRef   = useRef(null)
  const navigate    = useNavigate()

  // Source de vérité pour l'authentification : le store global (Zustand),
  // déjà initialisé depuis localStorage (clés sbee_token / sbee_user)
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = isAuthenticated && user?.role_systeme === 'SUPER_ADMIN'

  // Charge les posts
  const fetchPosts = useCallback(async (p = 1, reset = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true)
    try {
      const { data } = await api.get('/posts', {
        params: { page: p, type: activeFilter === 'all' ? undefined : activeFilter, per_page: 10 }
      })
      const newPosts = data.data ?? []
      setPosts(prev => reset || p === 1 ? newPosts : [...prev, ...newPosts])
      setHasMore(data.current_page < data.last_page)
      setPage(p)
    } catch { /* silencieux */ }
    finally { setLoading(false); setLoadingMore(false) }
  }, [activeFilter])

  // Stats globales
  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  // Au retour de /login (après un clic sur "Publier"), le store est déjà à
  // jour de manière synchrone (login() met isAuthenticated/user avant le
  // navigate). On ouvre donc la modale directement si SUPER_ADMIN.
  useEffect(() => {
    const pendingAction = sessionStorage.getItem('post_login_action')
    if (pendingAction !== 'publish') return
    sessionStorage.removeItem('post_login_action')

    if (!isAuthenticated) {
      // La connexion a échoué / a été annulée
      return
    }

    if (user?.role_systeme === 'SUPER_ADMIN') {
      setShowCreateModal(true)
    } else {
      alert('Votre compte est connecté, mais seul un administrateur peut publier des actualités.')
    }
  }, [isAuthenticated, user])

  useEffect(() => { fetchPosts(1, true) }, [fetchPosts])

  // Infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchPosts(page + 1)
      }
    }, { threshold: 0.1 })
    if (bottomRef.current) observerRef.current.observe(bottomRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, page, fetchPosts])

  function handleLike(postId, liked) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !liked, nb_likes: liked ? p.nb_likes - 1 : p.nb_likes + 1 }
        : p
    ))
    api.post(`/posts/${postId}/like`).catch(() => {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked: liked, nb_likes: liked ? p.nb_likes + 1 : p.nb_likes - 1 } : p
      ))
    })
  }

  function handleNewPost(savedPost) {
    if (editingPost) {
      // Met à jour le post existant dans la liste
      setPosts(prev => prev.map(p => p.id === savedPost.id ? savedPost : p))
    } else {
      // Ajoute le nouveau post au début
      setPosts(prev => [savedPost, ...prev])
    }
    setShowCreateModal(false)
    setEditingPost(null)
  }

  const handleDelete = async (postId) => {
    if (!isAdmin) {
      alert('Action non autorisée.')
      return
    }
    if (!window.confirm('Voulez-vous vraiment supprimer cette actualité ?')) return
    try {
      await apiAuth.delete(`/posts/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (err) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleEdit = (post) => {
    if (!isAdmin) return
    setEditingPost(post)
  }

  const handleOpenCreateModal = () => {
    // Pas connecté : on envoie vers la connexion, en indiquant que l'on doit
    // revenir sur la page d'accueil (et non /dashboard) après authentification,
    // pour pouvoir y ouvrir la modale de publication si le compte est admin.
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_action', 'publish')
      navigate('/login', { state: { from: { pathname: '/' } } })
      return
    }

    if (!isAdmin) {
      alert('Action non autorisée. Seul un administrateur peut publier des actualités.')
      return
    }
    setShowCreateModal(true)
  }

  return (
    <div style={{ minHeight: '10vh', background: '#f5f5f5', fontFamily: 'Poppins, sans-serif' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 20px', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.svg" alt="SBEE" style={{ height: 80 }}
              onError={e => { e.target.style.display = 'none' }} />
          </div>

          {/* Centre — Filtres */}
          <div style={{ display: 'flex', gap: 4, background: '#f5f5f5', borderRadius: 99, padding: 4 }}>
            {[
              { key: 'all',   label: 'Tout' },
              { key: 'FOOT',  label: ' Football' },
              { key: 'BASK',  label: ' Basket' },
              { key: 'HAND',  label: ' Handball' },
            ].map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                style={{ padding: '10px 18px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', background: activeFilter === f.key ? '#ed1f24' : 'transparent', color: activeFilter === f.key ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Droite — Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && (
              <button onClick={handleOpenCreateModal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', border: '1px solid #ed1f24', borderRadius: 8, background: 'transparent', color: '#ed1f24', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                 Publier
              </button>
            )}
            <Link to="/login"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              Espace membres
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      <div style={{ background: 'white', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(237,31,36,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(237,31,36,0.1)' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#ed1f24', color: '#fff', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Live</span>
              <span style={{ fontSize: 15, color: '#080404' }}>Actualités sportives SBEE</span>
            </div>
            <p style={{ fontSize: 15, color: '#080404', marginTop: 8, maxWidth: 400 }}>
              Suivez toutes les actualités sportives de la Société Béninoise d'Énergie Électrique
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { icon: '', label: 'Matchs joués', val: stats.nb_matchs ?? '—' },
              { icon: '', label: 'Victoires',    val: stats.nb_victoires ?? '—' },
              { icon: '', label: 'Membres',      val: stats.nb_membres ?? '—' },
              { icon: ' ', label: 'Publications', val: stats.nb_posts ?? '—' },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, margin: 0 }}>{icon}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#0f0f0f', margin: '2px 0 0', fontFamily: 'Century Gothic, sans-serif' }}>{val}</p>
                <p style={{ fontSize: 10, color: '#9d7070', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── FEED ── */}
        <div>
          {/* Bouton créer un post rapide */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ed1f24', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            </div>
            <button onClick={handleOpenCreateModal}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #e8e8e8', borderRadius: 99, background: '#f9fafb', fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', textAlign: 'left' }}>
              Partagez une actualité sportive...
            </button>
           
          </div>

          {/* Liste des posts */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader2 size={28} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 12 }}>Chargement des actualités...</p>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #e8e8e8' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}></p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Aucune actualité pour l'instant</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Soyez le premier à publier une actualité !</p>
              {isAdmin && (
                <button onClick={handleOpenCreateModal} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                   Publier
                </button>
              )}
            </div>
          ) : (
            posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                onLike={handleLike} 
                onDelete={handleDelete} 
                onEdit={handleEdit}
                isAdmin={isAdmin}
              />
            ))
          )}

          {/* Loader infinite scroll */}
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 size={22} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          )}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* ── SIDEBAR ── */}
        <div style={{ position: 'sticky', top: 80 }}>

          {/* Prochains matchs */}
          <SidebarCard title="🗓 Prochains matchs" />

          {/* Classement */}
          <SidebarCard title=" Résultats récents" style={{ marginTop: 12 }} />

          {/* À propos */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, padding: '16px', marginTop: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>À propos du club</h3>
            <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              Le club sportif de la SBEE regroupe les sections Football, Basketball et Handball. 
              Ouvert à tous les employés et leurs familles.
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[' Football', ' Basket', ' Handball'].map(s => (
                <span key={s} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: '#fef2f2', color: '#ed1f24', border: '1px solid #fecaca', fontWeight: 500 }}>{s}</span>
              ))}
            </div>
            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, padding: '10px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              Accès membres
            </Link>
          </div>

          {/* Footer */}
          <p style={{ fontSize: 10, color: '#d1d5db', textAlign: 'center', marginTop: 14 }}>
            © {new Date().getFullYear()} SBEE Sport · Cotonou, Bénin
          </p>
        </div>
      </div>

      {/* ── MODAL CRÉATION / ÉDITION POST ── */}
      {(showCreateModal || editingPost) && (
        <CreatePostModal
          onClose={() => { setShowCreateModal(false); setEditingPost(null); }}
          onCreated={handleNewPost}
          postToEdit={editingPost}
          isAdmin={isAdmin}
        />
      )}

      <style>{`
        @keyframes spin   { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 768px) {
          .home-grid { grid-template-columns: 1fr !important; }
          .sidebar   { display: none; }
        }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  CARTE POST
// ══════════════════════════════════════════════════════
function PostCard({ post, onLike, onDelete, onEdit, isAdmin }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState(post.comments ?? [])
  const [commentText, setCommentText]   = useState('')
  const [pseudonyme, setPseudonyme]     = useState('')
  const [sending, setSending]           = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [expanded, setExpanded]         = useState(false)
  const [isMenuOpen, setIsMenuOpen]     = useState(false)

  async function loadComments() {
    if (showComments) { setShowComments(false); return }
    setShowComments(true)
    if (comments.length > 0) return
    setLoadingComments(true)
    try {
      const { data } = await api.get(`/posts/${post.id}/commentaires`)
      setComments(data.data ?? data ?? [])
    } catch {}
    finally { setLoadingComments(false) }
  }

  async function sendComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    try {
      const { data } = await api.post(`/posts/${post.id}/commentaires`, {
        contenu:    commentText,
        pseudonyme: pseudonyme || 'Anonyme',
      })
      setComments(prev => [...prev, data.commentaire ?? data])
      setCommentText('')
    } catch {}
    finally { setSending(false) }
  }

  const discipline = post.discipline ?? post.tags?.[0]
  const discColor  = discipline?.includes('oot') ? '#2563eb' : discipline?.includes('ask') ? '#d97706' : discipline?.includes('and') ? '#059669' : '#6b7280'
  const discBg     = discipline?.includes('oot') ? '#eff6ff' : discipline?.includes('ask') ? '#fffbeb' : discipline?.includes('and') ? '#f0fdf4' : '#f9fafb'

  const texteAffiche = expanded || !post.contenu || post.contenu.length <= 280
    ? post.contenu
    : post.contenu.slice(0, 280) + '…'

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, marginBottom: 14, overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#ed1f24', flexShrink: 0 }}>
          {post.auteur?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{post.auteur ?? 'Anonyme'}</p>
            {discipline && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: discBg, color: discColor, fontWeight: 600 }}>
                {discipline}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 1 }}>{timeAgo(post.created_at)}</p>
        </div>
        
        {/* Menu 3 points (Admin uniquement) */}
        {isAdmin && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}
            >
              <MoreHorizontal size={18} />
            </button>
            {isMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: 8, zIndex: 99, padding: '6px 0', minWidth: 120, border: '1px solid #f3f4f6' }}>
                <button onClick={() => { onEdit(post); setIsMenuOpen(false); }} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Modifier</button>
                <button onClick={() => { onDelete(post.id); setIsMenuOpen(false); }} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'none', fontSize: 13, color: '#ef4444', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Supprimer</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Texte */}
      {post.contenu && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.6, margin: 0 }}>{texteAffiche}</p>
          {post.contenu?.length > 280 && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ fontSize: 13, color: '#ed1f24', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4, fontFamily: 'Poppins, sans-serif' }}>
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      {/* Médias */}
      {post.medias?.length > 0 && (
        <MediaGallery medias={post.medias} />
      )}

      {/* Stats */}
      <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f9fafb', borderBottom: '1px solid #f9fafb' }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{post.nb_likes > 0 ? `${fmt(post.nb_likes)} j'aime` : ''}</span>
        <span style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer' }} onClick={loadComments}>
          {post.nb_commentaires > 0 ? `${fmt(post.nb_commentaires)} commentaire${post.nb_commentaires > 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Actions */}
      <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
        <ActionBtn icon={<ThumbsUp size={16} />} label="J'aime" active={post.liked} color="#ed1f24"
          onClick={() => onLike(post.id, post.liked)} />
        <ActionBtn icon={<MessageCircle size={16} />} label="Commenter" onClick={loadComments} />
        <ActionBtn icon={<Share2 size={16} />} label="Partager"
          onClick={() => navigator.share?.({ title: 'SBEE Sport', text: post.contenu, url: window.location.href })} />
      </div>

      {/* Commentaires */}
      {showComments && (
        <div style={{ padding: '8px 16px 14px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
          {loadingComments ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <Loader2 size={18} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {comments.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Aucun commentaire. Soyez le premier !</p>}
              {comments.map((c, i) => (
                <div key={c.id ?? i} style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#ed1f24', flexShrink: 0 }}>
                    {(c.pseudonyme ?? c.auteur ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '8px 12px', border: '1px solid #f0f0f0' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{c.pseudonyme ?? c.auteur ?? 'Anonyme'}</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: '2px 0 0', lineHeight: 1.5 }}>{c.contenu}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '4px 0 0' }}>{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire commentaire */}
          <form onSubmit={sendComment} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={pseudonyme} onChange={e => setPseudonyme(e.target.value)}
              placeholder="Votre prénom (optionnel)"
              style={{ padding: '7px 12px', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 12, fontFamily: 'Poppins, sans-serif', outline: 'none', background: '#fff' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Écrivez un commentaire..."
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e8e8e8', borderRadius: 99, fontSize: 13, fontFamily: 'Poppins, sans-serif', outline: 'none', background: '#fff' }} />
              <button type="submit" disabled={!commentText.trim() || sending}
                style={{ padding: '8px 12px', border: 'none', borderRadius: 99, background: '#ed1f24', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: !commentText.trim() ? 0.5 : 1 }}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ── Bouton action ──
function ActionBtn({ icon, label, onClick, active, color = '#6b7280' }) {
  return (
    <button onClick={onClick}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', border: 'none', background: 'none', color: active ? color : '#6b7280', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', borderRadius: 8, fontFamily: 'Poppins, sans-serif', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {icon} <span className="action-label">{label}</span>
    </button>
  )
}

// ── Galerie médias ──
function MediaGallery({ medias }) {
  const [activeVideo, setActiveVideo] = useState(null)
  const images = medias.filter(m => m.type === 'IMAGE' || m.mime_type?.startsWith('image'))
  const videos = medias.filter(m => m.type === 'VIDEO' || m.mime_type?.startsWith('video'))

  const grid = images.length === 1
    ? '1fr'
    : images.length === 2
      ? '1fr 1fr'
      : images.length >= 3
        ? '1fr 1fr 1fr'
        : '1fr'

  const getMediaUrl = (m) => {
    const rawUrl = m.url ?? m.chemin;
    return rawUrl?.startsWith('http') ? rawUrl : `${API_BASE}/storage/${rawUrl}`;
  };

  return (
    <div>
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 2, marginBottom: videos.length > 0 ? 2 : 0 }}>
          {images.slice(0, 4).map((m, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: images.length === 1 ? '56.25%' : '100%', overflow: 'hidden', background: '#f9fafb' }}>
              <img src={getMediaUrl(m)} alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }} />
              {i === 3 && images.length > 4 && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>+{images.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {videos.map((v, i) => (
        <div key={i} style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <video src={getMediaUrl(v)} controls
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ))}
    </div>
  )
}

// ── Sidebar card placeholder ──
function SidebarCard({ title, style: extraStyle }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const endpoint = title.includes('match') ? '/prochains-matchs' : '/resultats-recents'
    api.get(endpoint).then(({ data }) => setData(data.slice?.(0, 5) ?? [])).catch(() => setData([])).finally(() => setLoading(false))
  }, [title])

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, padding: '14px 16px', ...extraStyle }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>{title}</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Loader2 size={16} style={{ color: '#ed1f24', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : data.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Aucune donnée disponible</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f9fafb', borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                  {item.adversaire ? `vs ${item.adversaire}` : item.titre}
                </p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{item.section?.nom ?? ''}</p>
              </div>
              {item.resultat ? (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: item.resultat === 'VICTOIRE' ? '#f0fdf4' : item.resultat === 'DEFAITE' ? '#fef2f2' : '#fffbeb', color: item.resultat === 'VICTOIRE' ? '#059669' : item.resultat === 'DEFAITE' ? '#dc2626' : '#d97706' }}>
                  {item.resultat === 'VICTOIRE' ? 'V' : item.resultat === 'DEFAITE' ? 'D' : 'N'}
                  {item.score_nous != null ? ` ${item.score_nous}-${item.score_adverse}` : ''}
                </span>
              ) : (
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  {item.date_heure ? new Date(item.date_heure).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  MODAL CRÉATION / ÉDITION POST
// ══════════════════════════════════════════════════════
function CreatePostModal({ onClose, onCreated, postToEdit, isAdmin }) {
  const [contenu, setContenu]       = useState(postToEdit?.contenu ?? '')
  const [auteur, setAuteur]       = useState(postToEdit?.auteur ?? '')
  const [discipline, setDiscipline] = useState(postToEdit?.discipline ?? '')
  const [files, setFiles]         = useState([])
  const [previews, setPreviews]   = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const fileRef = useRef(null)

  // Pré-remplir les médias existants si l'on est en mode édition
  useEffect(() => {
    if (postToEdit?.medias) {
      const existingPreviews = postToEdit.medias.map(m => {
        const rawUrl = m.url ?? m.chemin;
        const fullUrl = rawUrl?.startsWith('http') ? rawUrl : `${API_BASE}/storage/${rawUrl}`;
        return {
          url: fullUrl,
          type: m.type === 'VIDEO' || m.mime_type?.startsWith('video') ? 'VIDEO' : 'IMAGE',
          name: m.name ?? 'Média existant'
        }
      })
      setPreviews(existingPreviews)
    }
  }, [postToEdit])

  function handleFiles(e) {
    const selected = Array.from(e.target.files ?? [])
    setFiles(prev => [...prev, ...selected])
    selected.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setPreviews(prev => [...prev, { url: ev.target.result, type: f.type.startsWith('video') ? 'VIDEO' : 'IMAGE', name: f.name }])
      reader.readAsDataURL(f)
    })
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, j) => j !== i))
    setPreviews(prev => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!contenu.trim()) { setError('Le contenu est obligatoire.'); return }
    
    // Vérification de sécurité frontend Admin (filet de sécurité — la vraie
    // restriction est imposée par le middleware role:SUPER_ADMIN côté backend Laravel)
    if (!isAdmin) {
      setError('Action non autorisée. Seul un administrateur peut publier.')
      return
    }

    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('contenu', contenu)
      fd.append('auteur', auteur || 'Anonyme')
      if (discipline) fd.append('discipline', discipline)
      
      if (postToEdit) {
        fd.append('_method', 'PUT')
      }

      files.forEach((f, i) => fd.append(`medias[${i}]`, f))

      const url = postToEdit ? `/public/posts/${postToEdit.id}` : '/public/posts'
      
      // apiAuth ajoute automatiquement le header Authorization (token sbee_token)
      const { data } = await apiAuth.post(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      onCreated(data.post ?? data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la publication.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', animation: 'fadeIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            {postToEdit ? ' Modifier une actualité' : ' Publier une actualité'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: '#f5f5f5', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: '3px solid #ed1f24', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Auteur */}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Prénom / pseudo de l'auteur</label>
            <input value={auteur} onChange={e => setAuteur(e.target.value)}
              placeholder="Anonyme si non renseigné"
              style={inp} />
          </div>

          {/* Discipline */}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Section concernée (optionnel)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: '', label: 'Général' },
                { key: 'Football', label: ' Football' },
                { key: 'Basketball', label: ' Basket' },
                { key: 'Handball', label: ' Handball' },
              ].map(d => (
                <button key={d.key} type="button" onClick={() => setDiscipline(d.key)}
                  style={{ flex: 1, padding: '7px 4px', border: `1px solid ${discipline === d.key ? '#ed1f24' : '#e5e7eb'}`, borderRadius: 8, background: discipline === d.key ? '#fef2f2' : '#fafafa', fontSize: 11, color: discipline === d.key ? '#ed1f24' : '#6b7280', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: discipline === d.key ? 600 : 400 }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Actualité *</label>
            <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={5}
              placeholder="Partagez une actualité, un résultat, une photo de match..."
              style={{ ...inp, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 3 }}>{contenu.length} caractères</p>
          </div>

          {/* Médias */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Photos / Vidéos</label>

            {/* Previews */}
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                    {p.type === 'VIDEO'
                      ? <video src={p.url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={p.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    <button type="button" onClick={() => removeFile(i)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '2px dashed #e5e7eb', borderRadius: 10, background: '#fafafa', cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Image size={20} style={{ color: '#ed1f24' }} />
                <Video size={20} style={{ color: '#ed1f24' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>Ajouter des photos ou vidéos</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>JPG, PNG, MP4, MOV, AVI — max 100 Mo chacun</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving || !contenu.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', border: 'none', borderRadius: 8, background: '#ed1f24', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', opacity: (saving || !contenu.trim()) ? 0.6 : 1 }}>
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
              {saving ? (postToEdit ? 'Modification...' : 'Publication...') : (postToEdit ? 'Modifier' : 'Publier')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 5, display: 'block' }
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Poppins, sans-serif', background: '#fafafa', boxSizing: 'border-box' }