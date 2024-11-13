// frontend/src/components/Player.jsx
import { useState, useEffect } from 'react'

function Player() {
  const [tracks, setTracks] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => {
        setTracks(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching tracks:', err)
        setError('Ошибка при загрузке треков')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="player-message">Загрузка...</div>
  }

  if (error) {
    return <div className="player-message error">{error}</div>
  }

  return (
    <div className="player">
      {tracks.length === 0 ? (
        <div className="player-message">
          Треков пока нет. Добавьте первый трек через админ-панель.
        </div>
      ) : (
        <>
          <audio
            controls
            src={currentTrack ? `/api/tracks/${currentTrack.id}` : ''}
            className="audio-player"
          />
          <div className="playlist">
            <h3>Плейлист</h3>
            {tracks.map(track => (
              <div
                key={track.id}
                onClick={() => setCurrentTrack(track)}
                className={`playlist-item ${currentTrack?.id === track.id ? 'active' : ''}`}
              >
                {track.title}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Player
