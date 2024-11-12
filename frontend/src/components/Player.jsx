import React, { useState, useEffect } from 'react';

function Player() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [audio] = useState(new Audio());

  useEffect(() => {
    // Загружаем список треков при монтировании
    fetch('http://localhost:5000/api/tracks')
      .then(res => res.json())
      .then(data => setTracks(data))
      .catch(err => console.error('Error loading tracks:', err));
  }, []);

  const playTrack = (track) => {
    audio.src = `http://localhost:5000/api/tracks/${track.id}`;
    audio.play();
    setCurrentTrack(track);
  };

  const stopTrack = () => {
    audio.pause();
    setCurrentTrack(null);
  };

  return (
    <div>
      <h1>TUBIK Player</h1>
      
      <div style={{ marginTop: '20px' }}>
        {tracks.map(track => (
          <div 
            key={track.id} 
            style={{
              padding: '10px',
              margin: '5px',
              border: '1px solid #ccc',
              cursor: 'pointer',
              backgroundColor: currentTrack?.id === track.id ? '#e0e0e0' : 'white'
            }}
            onClick={() => currentTrack?.id === track.id ? stopTrack() : playTrack(track)}
          >
            <div>{track.title}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>{track.artist}</div>
          </div>
        ))}
      </div>

      {tracks.length === 0 && (
        <div>No tracks available</div>
      )}
    </div>
  );
}

export default Player;
