// App.jsx
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Player from './components/Player'
import AdminPanel from './components/AdminPanel'
import Radio from './components/Radio'
import Callback from './components/Callback'

function AppContent() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [currentPage, setCurrentPage] = useState('player')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('https://auth.tubik-corp.ru/api/auth/check', {
        credentials: 'include'
      })
      setIsAuthorized(response.status === 200)
    } catch (err) {
      console.error('Auth check error:', err)
      setIsAuthorized(false)
    }
  }

  const handleLogin = () => {
    const params = new URLSearchParams({
      client_id: 'your_client_id',
      redirect_uri: window.location.origin + '/callback',
      state: Math.random().toString(36).substring(7),
      response_type: 'code'
    })
    window.location.href = `https://auth.tubik-corp.ru/login?${params}`
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>TUBIK-music</h1>
        <div className="header-controls">
          <button 
            className={`nav-btn ${currentPage === 'player' ? 'active' : ''}`} 
            onClick={() => setCurrentPage('player')}
          >
            Плеер
          </button>
          <button 
            className={`nav-btn ${currentPage === 'radio' ? 'active' : ''}`} 
            onClick={() => setCurrentPage('radio')}
          >
            Радио
          </button>
          {!isAuthorized ? (
            <button className="login-btn" onClick={handleLogin}>
              Войти
            </button>
          ) : (
            <button className="admin-btn" onClick={() => setShowAdminPanel(!showAdminPanel)}>
              Админ панель
            </button>
          )}
        </div>
      </div>

      {currentPage === 'player' ? 
        <Player isAuthorized={isAuthorized} onUnauthorized={handleLogin} /> : 
        <Radio isAuthorized={isAuthorized} onUnauthorized={handleLogin} />
      }

      {showAdminPanel && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowAdminPanel(false)}>×</button>
            <AdminPanel />
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App