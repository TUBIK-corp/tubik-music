import { useState, useEffect } from 'react';
import { Edit, Delete } from '@mui/icons-material';

function AdminPanel() {
  const [tracks, setTracks] = useState([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const response = await fetch('/api/tracks');
      const data = await response.json();
      setTracks(data);
    } catch (err) {
      console.error('Error fetching tracks:', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setFile(null);
    setImage(null);
    setEditingTrack(null);
    // Reset file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => (input.value = ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    try {
      const formData = new FormData();
      
      if (editingTrack) {
        // Update existing track
        formData.append('title', title);
        formData.append('artist', artist);
        if (image) formData.append('image', image);

        const response = await fetch(`/api/tracks/${editingTrack.id}`, {
          method: 'PUT',
          body: formData,
        });
        
        if (response.ok) {
          setMessage('Трек успешно обновлен');
          fetchTracks();
        } else {
          setMessage('Ошибка при обновлении трека');
        }
      } else {
        // Upload new track
        if (!file || !title) {
          setMessage('Заполните все обязательные поля');
          return;
        }

        formData.append('file', file);
        formData.append('title', title);
        formData.append('artist', artist);
        if (image) formData.append('image', image);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          setMessage('Трек успешно загружен');
          fetchTracks();
        } else {
          setMessage('Ошибка при загрузке трека');
        }
      }
      
      resetForm();
    } catch (err) {
      setMessage('Ошибка при обработке запроса');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (track) => {
    setEditingTrack(track);
    setTitle(track.title);
    setArtist(track.artist || '');
  };

  const handleDelete = async (trackId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот трек?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMessage('Трек успешно удален');
        fetchTracks();
      } else {
        setMessage('Ошибка при удалении трека');
      }
    } catch (err) {
      setMessage('Ошибка при удалении трека');
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="admin-panel">
      <h2>{editingTrack ? 'Редактирование трека' : 'Загрузка нового трека'}</h2>
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
          <label>Исполнитель:</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
        </div>
        {!editingTrack && (
          <div>
            <label>Файл MP3:</label>
            <input
              type="file"
              accept=".mp3"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </div>
        )}
        <div>
          <label>Обложка:</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>
        <div className="form-buttons">
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Загрузка...' : (editingTrack ? 'Сохранить' : 'Загрузить')}
          </button>
          {editingTrack && (
            <button type="button" onClick={resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
      
      {message && (
        <p className={message.includes('успешно') ? 'success' : 'error'}>
          {message}
        </p>
      )}

      <div className="tracks-list">
        <h3>Управление треками</h3>
        <table>
          <thead>
            <tr>
              <th>Обложка</th>
              <th>Название</th>
              <th>Исполнитель</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(track => (
              <tr key={track.id}>
                <td>
                  <img
                    src={track.imageUrl || '/api/images/default.jpg'}
                    alt={track.title}
                    style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                  />
                </td>
                <td>{track.title}</td>
                <td>{track.artist}</td>
                <td>
                  <button
                    className="icon-button"
                    onClick={() => handleEdit(track)}
                    title="Редактировать"
                  >
                    <Edit />
                  </button>
                  <button
                    className="icon-button delete"
                    onClick={() => handleDelete(track.id)}
                    title="Удалить"
                  >
                    <Delete />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPanel;
