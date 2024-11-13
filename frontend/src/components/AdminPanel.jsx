import { useState } from 'react'

function AdminPanel() {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      if (!file || !title) {
        setMessage('Заполните все поля')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('Трек успешно загружен')
        setTitle('')
        setFile(null)
        // Сбросить input file
        e.target.reset()
      } else {
        setMessage(`Ошибка: ${data.error || 'Что-то пошло не так'}`)
      }
    } catch (err) {
      setMessage('Ошибка при загрузке')
      console.error('Upload error:', err)
    } finally {
      setIsLoading(false)
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Загрузка...' : 'Загрузить'}
        </button>
      </form>
      {message && <p className={message.includes('успешно') ? 'success' : 'error'}>
        {message}
      </p>}
    </div>
  )
}

export default AdminPanel
