import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

function Radio() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const [radioStatus, setRadioStatus] = useState(null);
  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const DEFAULT_COVER = 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg';

  useEffect(() => {
    checkRadioStatus();
    const interval = setInterval(checkRadioStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkRadioStatus = async () => {
    try {
      const response = await fetch('/api/radio/status');
      if (!response.ok) throw new Error('Failed to fetch radio status');
      const status = await response.json();
      setRadioStatus(status);
      setCurrentTrack(status.current_track);
      
      if (!status.has_tracks) {
        setError('Нет доступных треков. Загрузите хотя бы один трек.');
      } else {
        setError(null);
      }
    } catch (err) {
      setError('Не удалось получить статус радио');
      console.error(err);
    }
  };

  const initializeHLS = () => {
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      hlsRef.current = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current.attachMedia(audioRef.current);
      hlsRef.current.on(Hls.Events.MEDIA_ATTACHED, () => {
        hlsRef.current.loadSource('/api/radio/hls/playlist.m3u8');
      });

      hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsRef.current.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsRef.current.recoverMediaError();
              break;
            default:
              disconnectFromRadio();
              break;
          }
        }
      });
    } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      audioRef.current.src = '/api/radio/hls/playlist.m3u8';
    }
  };

  const connectToRadio = async () => {
    try {
      if (!radioStatus?.has_tracks) {
        setError('Нет доступных треков. Загрузите хотя бы один трек.');
        return;
      }

      if (!isConnected) {
        initializeHLS();
        await audioRef.current.play();
        setIsConnected(true);
        setError(null);
      } else {
        disconnectFromRadio();
      }
    } catch (err) {
      setError('Не удалось подключиться к радио');
      console.error('Connection error:', err);
    }
  };

  const disconnectFromRadio = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsConnected(false);
  };

  return (
    <div className="radio-container">
      <div className="radio-wave-animation" />
      <div className="radio-player">
        <audio ref={audioRef} />
        
        <div className="radio-status">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'В эфире' : 'Не подключено'}</span>
        </div>

        <div className="radio-image-container">
          <img 
            src={currentTrack?.imageUrl || DEFAULT_COVER} 
            alt="Radio" 
            className={`radio-image ${isConnected ? 'spinning' : ''}`} 
          />
        </div>

        <div className="radio-info">
          <h2>Случайный плейлист</h2>
          <p>Круглосуточное вещание</p>
        </div>

        {currentTrack && (
          <div className="current-track">
            <p className="track-title">{currentTrack.title}</p>
            <p className="track-artist">{currentTrack.artist}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="radio-controls">
          <button 
            className={`radio-btn ${isConnected ? 'connected' : ''}`}
            onClick={connectToRadio}
            disabled={!radioStatus?.has_tracks}
          >
            {isConnected ? 'Отключиться' : 'Подключиться'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Radio;