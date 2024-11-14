// App.jsx
import { useState } from 'react'
import Player from './components/Player'
import AdminPanel from './components/AdminPanel'
import Login from './components/Login'
import Radio from './components/Radio'

function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [currentPage, setCurrentPage] = useState('player') // 'player' or 'radio'

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
          {!isAdmin ? (
            <button className="login-btn" onClick={() => setShowLogin(true)}>
              Войти
            </button>
          ) : (
            <button className="admin-btn" onClick={() => setShowAdminPanel(!showAdminPanel)}>
              Админ панель
            </button>
          )}
        </div>
      </div>

      {currentPage === 'player' ? <Player /> : <Radio />}

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowLogin(false)}>×</button>
            <Login 
              onLogin={() => {
                setIsAdmin(true)
                setShowLogin(false)
              }} 
            />
          </div>
        </div>
      )}

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

export default App