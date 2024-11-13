// frontend/src/components/Login.jsx
import { useState } from 'react'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      
      if (data.success) {
        onLogin()
        setError('')
      } else {
        setError('Неверный пароль')
      }
    } catch (err) {
      setError('Ошибка при входе')
    }
  }

  return (
    <div className="login-form">
      <h2>Вход в админ-панель</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Введите пароль"
          required
        />
        <button type="submit">Войти</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default Login
