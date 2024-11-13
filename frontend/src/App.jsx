// App.jsx
import { useState } from 'react'
import Player from './components/Player'
import AdminPanel from './components/AdminPanel'
import Login from './components/Login'

function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  return (
    <div className="app">
      <div className="app-header">
        <h1>TUBIK-music</h1>
        <div className="header-controls">
          {!isAdmin ? (
            <button className="login-btn" onClick={() => setShowLogin(true)}>
              Войти
            </button>
          ) : (
            <button 
              className="admin-btn" 
              onClick={() => setShowAdminPanel(!showAdminPanel)}
            >
              Админ панель
            </button>
          )}
        </div>
      </div>

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

      <Player />
    </div>
  )
}

export default App