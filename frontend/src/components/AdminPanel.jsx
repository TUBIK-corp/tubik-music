// frontend/src/components/AdminPanel.jsx
import { useState } from 'react'

function AdminPanel() {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file || !title) {
      setMessage('Заполните все поля')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage('Трек успешно загружен')
        setTitle('')
        setFile(null)
        // Обновить список треков в плеере
        window.location.reload()
      } else {
        setMessage('Ошибка при загрузке')
      }
    } catch (err) {
      setMessage('Ошибка при загрузке')
    }
  }

  return (
    <div className="admin-panel">
      <h2>Загрузка нового трека</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Название трека:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Файл MP3:</label>
          <input
            type="file"
            accept=".mp3"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>
        <button type="submit">Загрузить</button>
      </form>
      {message && <p className={message.includes('успешно') ? 'success' : 'error'}>
        {message}
      </p>}
    </div>
  )
}

export default AdminPanel
