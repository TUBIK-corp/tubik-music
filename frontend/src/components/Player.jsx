// Player.jsx
import { useState, useEffect, useRef } from 'react';
import { 
  PlayArrow, Pause, SkipNext, SkipPrevious, 
  VolumeUp, Favorite, Shuffle, Repeat, 
  AccountCircle, Settings 
} from '@mui/icons-material';

function Player() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showWave, setShowWave] = useState(false);
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const audioRef = useRef(null);

  useEffect(() => {
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => {
        setTracks(Array.isArray(data) ? data : []);
        if (data.length > 0) setCurrentTrack(data[0]);
      })
      .catch(err => console.error('Error fetching tracks:', err));
  }, []);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [currentTrack]);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.load(); // Загружаем новый трек
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Autoplay prevented:", error);
          });
        }
      }
    }
  }, [currentTrack]); // Зависимость от currentTrack
  
  // Измените обработчик клика на трек
  const handleTrackClick = (track) => {
    const isSameTrack = currentTrack?.id === track.id;
    
    if (isSameTrack) {
      // Если тот же трек - просто переключаем воспроизведение
      handlePlay();
    } else {
      // Если новый трек
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Playback prevented:", error);
          });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="app-container">
      <div className="player-header">
        {!isAdmin ? (
          <button 
            className="control-btn login-btn" 
            onClick={() => setShowLogin(true)}
          >
            Войти
          </button>
        ) : (
          <button 
            className="control-btn admin-btn" 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            Добавить трек
          </button>
        )}
      </div>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowLogin(false)}>×</button>
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
            <button className="close-modal" onClick={() => setShowAdminPanel(false)}>×</button>
            <AdminPanel />
          </div>
        </div>
      )}



      {/* Main Content */}
      <main className="main-content">
        {showWave && <div className="wave-animation" />}
        
        <div className="tracks-container">
          {tracks.map(track => (
            <div 
                key={track.id}
                className={`track-card ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => handleTrackClick(track)}
              >
              <div className="track-image">
                <img src={track.coverUrl || 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg'} alt={track.title} />
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="playing-animation">
                    <span></span><span></span><span></span><span></span>
                  </div>
                )}
              </div>
              <div className="track-info">
                <h3>{track.title}</h3>
                <p>{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Player Bar */}
      <div className="player-bar">
        <audio
          ref={audioRef}
          src={currentTrack ? `/api/tracks/${currentTrack.id}` : ''}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />

        <div className="player-bar-content">
          <div className="now-playing">
            {currentTrack && (
              <>
                <img 
                  src={currentTrack.coverUrl || 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg'} 
                  alt={currentTrack.title}
                />
                <div className="track-info">
                  <h4>{currentTrack.title}</h4>
                  <p>{currentTrack.artist}</p>
                </div>
                <button className="favorite-btn">
                  <Favorite />
                </button>
              </>
            )}
          </div>

          <div className="player-controls">
            <div className="control-buttons">
              <button className="control-btn">
                <Shuffle />
              </button>
              <button className="control-btn">
                <SkipPrevious />
              </button>
              <button className="play-btn" onClick={handlePlay}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </button>
              <button className="control-btn">
                <SkipNext />
              </button>
              <button className="control-btn">
                <Repeat />
              </button>
            </div>

            <div className="progress-container">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                className="progress-slider"
                onChange={(e) => {
                  const time = Number(e.target.value);
                  setCurrentTime(time);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                  }
                }}
              />
              <span>{formatTime(duration || 0)}</span>
            </div>
          </div>

          <div className="volume-control">
            <VolumeUp />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              className="volume-slider"
              onChange={(e) => {
                const value = Number(e.target.value);
                setVolume(value);
                if (audioRef.current) {
                  audioRef.current.volume = value;
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;