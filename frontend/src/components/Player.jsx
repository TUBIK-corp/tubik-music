import { useState, useEffect, useRef } from 'react';
import { 
  PlayArrow, Pause, SkipNext, SkipPrevious, 
  VolumeUp, Favorite, Shuffle, Repeat, RepeatOne,
  AccountCircle, Settings, Refresh 
} from '@mui/icons-material';

function Player() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showWave, setShowWave] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const audioRef = useRef(null);
  const DEFAULT_COVER = 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg';

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/proxy/auth/check', {
        credentials: 'include'
      });
      return response.status === 200;
    } catch (err) {
      console.error('Auth check error:', err);
      return false;
    }
};

  const redirectToAuth = () => {
    const params = new URLSearchParams({
      client_id: 'your_client_id',
      redirect_uri: window.location.origin + '/callback',
      state: Math.random().toString(36).substring(7),
      response_type: 'code'
    });
    window.location.href = `https://auth.tubik-corp.ru/login?${params}`;
  };

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('userFavorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const fetchTracks = async () => {
    try {
      const response = await fetch('/api/tracks');
      const data = await response.json();
      setTracks(Array.isArray(data) ? data : []);
      if (data.length > 0 && !currentTrack) {
        setCurrentTrack(data[0]);
        initializeShuffledIndices(data.length);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to load tracks');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [currentTrack]);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Autoplay prevented:", error);
          });
        }
      }
    }
  }, [currentTrack]);

  const initializeShuffledIndices = (length) => {
    const indices = Array.from({ length }, (_, i) => i);
    setShuffledIndices(shuffleArray([...indices]));
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleTrackClick = async (track) => {
    const isAuth = await checkAuth();
    
    if (!isAuth) {
      redirectToAuth();
      return;
    }

    const isSameTrack = currentTrack?.id === track.id;
    if (isSameTrack) {
      handlePlay();
    } else {
      const newIndex = tracks.findIndex(t => t.id === track.id);
      setCurrentTrackIndex(newIndex);
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

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    
    let newIndex;
    if (isShuffleOn) {
      const currentShuffleIndex = shuffledIndices.indexOf(currentTrackIndex);
      newIndex = shuffledIndices[currentShuffleIndex === 0 ? shuffledIndices.length - 1 : currentShuffleIndex - 1];
    } else {
      newIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    }
    
    setCurrentTrackIndex(newIndex);
    setCurrentTrack(tracks[newIndex]);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    
    let newIndex;
    if (isShuffleOn) {
      const currentShuffleIndex = shuffledIndices.indexOf(currentTrackIndex);
      newIndex = shuffledIndices[currentShuffleIndex === shuffledIndices.length - 1 ? 0 : currentShuffleIndex + 1];
    } else {
      newIndex = currentTrackIndex === tracks.length - 1 ? 0 : currentTrackIndex + 1;
    }
    
    setCurrentTrackIndex(newIndex);
    setCurrentTrack(tracks[newIndex]);
    setIsPlaying(true);
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all' || isShuffleOn) {
      handleNextTrack();
    } else {
      if (currentTrackIndex === tracks.length - 1) {
        setIsPlaying(false);
      } else {
        handleNextTrack();
      }
    }
  };

  const toggleRepeatMode = () => {
    setRepeatMode(current => {
      switch (current) {
        case 'none':
          return 'all';
        case 'all':
          return 'one';
        case 'one':
          return 'none';
        default:
          return 'none';
      }
    });
  };

  const toggleShuffle = () => {
    if (!isShuffleOn) {
      initializeShuffledIndices(tracks.length);
    }
    setIsShuffleOn(!isShuffleOn);
  };

  const toggleFavorite = (trackId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId];
      
      try {
        localStorage.setItem('userFavorites', JSON.stringify(newFavorites));
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
      
      return newFavorites;
    });
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
      const progressPercent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      audioRef.current.parentElement.style.setProperty('--progress-percent', `${progressPercent}%`);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    fetchTracks();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app-container">
      <div className="player-header">
        <button 
          className="control-btn refresh-btn" 
          onClick={handleRefresh}
          title="Обновить список треков"
        >
          <Refresh />
        </button>
        {!isAdmin ? (
          <button 
            className="control-btn login-btn" 
            onClick={() => setShowLogin(true)}
          >
            <AccountCircle /> Войти
          </button>
        ) : (
          <button 
            className="control-btn admin-btn" 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            <Settings /> Управление треками
          </button>
        )}
      </div>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowLogin(false)}>×</button>
            <Login 
              onLogin={() => {
                setIsAdmin(true);
                setShowLogin(false);
              }} 
            />
          </div>
        </div>
      )}

      {showAdminPanel && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAdminPanel(false)}>×</button>
            <AdminPanel onUpdate={fetchTracks} />
          </div>
        </div>
      )}

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
                <img 
                  src={track.imageUrl || DEFAULT_COVER} 
                  alt={track.title}
                  onError={(e) => {
                    e.target.src = DEFAULT_COVER;
                  }}
                />
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
              <button 
                className={`card-favorite-btn ${favorites.includes(track.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(track.id);
                }}
              >
                <Favorite />
              </button>
            </div>
          ))}
        </div>
      </main>

      <div className="player-bar">
        <audio
          ref={audioRef}
          src={currentTrack ? `/api/tracks/${currentTrack.id}` : ''}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
        />

        <div className="player-bar-content">
          <div className="now-playing">
            {currentTrack && (
              <>
                <img 
                  src={currentTrack.imageUrl || DEFAULT_COVER}
                  alt={currentTrack.title}
                  onError={(e) => {
                    e.target.src = DEFAULT_COVER;
                  }}
                />
                <div className="track-info">
                  <h4>{currentTrack.title}</h4>
                  <p>{currentTrack.artist}</p>
                </div>
                <button 
                  className={`player-favorite-btn ${favorites.includes(currentTrack.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(currentTrack.id)}
                >
                  <Favorite className="player-favorite-icon" />
                </button>
              </>
            )}
          </div>

          <div className="player-controls">
            <div className="control-buttons">
              <button 
                className={`control-btn ${isShuffleOn ? 'active' : ''}`}
                onClick={toggleShuffle}
              >
                <Shuffle />
              </button>
              <button className="control-btn" onClick={handlePrevTrack}>
                <SkipPrevious />
              </button>
              <button className="play-btn" onClick={handlePlay}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </button>
              <button className="control-btn" onClick={handleNextTrack}>
                <SkipNext />
              </button>
              <button 
                className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
                onClick={toggleRepeatMode}
              >
                {repeatMode === 'one' ? <RepeatOne /> : <Repeat />}
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
              <span>{formatTime(duration)}</span>
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
