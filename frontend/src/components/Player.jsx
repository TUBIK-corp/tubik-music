// frontend/src/components/Player.jsx
import { useState, useEffect } from 'react'

function Player() {
  const [tracks, setTracks] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)

  useEffect(() => {
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => setTracks(data))
  }, [])

  return (
    <div className="player">
      <audio
        controls
        src={currentTrack ? `/api/tracks/${currentTrack.id}` : ''}
      />
      <div className="playlist">
        {tracks.map(track => (
          <div
            key={track.id}
            onClick={() => setCurrentTrack(track)}
            className={currentTrack?.id === track.id ? 'active' : ''}
          >
            {track.title}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Player
