// frontend/src/App.jsx
import { useState } from 'react'
import Player from './components/Player'
import AdminPanel from './components/AdminPanel'
import Login from './components/Login'

function App() {
  const [isAdmin, setIsAdmin] = useState(false)

  return (
    <div className="app">
      <h1>TUBIK Player</h1>
      <Player />
      {!isAdmin ? (
        <Login onLogin={() => setIsAdmin(true)} />
      ) : (
        <AdminPanel />
      )}
    </div>
  )
}

export default App
