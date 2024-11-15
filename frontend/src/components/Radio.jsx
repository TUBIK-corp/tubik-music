import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

function Radio() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const [radioStatus, setRadioStatus] = useState(null);
  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const lastSegmentRef = useRef(null);
  const DEFAULT_COVER = 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg';

  useEffect(() => {
    checkRadioStatus();
    const interval = setInterval(checkRadioStatus, 3000); // увеличиваем интервал до 3 секунд
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Если трек изменился и мы подключены, переинициализируем HLS
    if (currentTrack && isConnected) {
      reinitializeHLS();
    }
  }, [currentTrack?.id]); // Отслеживаем изменение ID трека

  const checkRadioStatus = async () => {
    try {
      const response = await fetch('/api/radio/status');
      if (!response.ok) throw new Error('Failed to fetch radio status');
      const status = await response.json();
      
      setRadioStatus(status);
      setCurrentTrack(status.current_track);

      // Если сегмент изменился и плеер подключен, переинициализируем HLS
      if (status.current_segment && 
          lastSegmentRef.current !== status.current_segment && 
          isConnected) {
        lastSegmentRef.current = status.current_segment;
        reinitializeHLS();
      }
      
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

  const reinitializeHLS = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    initializeHLS();
  };

  const initializeHLS = () => {
    if (Hls.isSupported()) {
      hlsRef.current = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 1,
        levelLoadingRetryDelay: 500,
      });

      hlsRef.current.attachMedia(audioRef.current);
      hlsRef.current.on(Hls.Events.MEDIA_ATTACHED, () => {
        hlsRef.current.loadSource('/api/radio/hls/playlist.m3u8');
      });

      hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error encountered, trying to recover...');
              hlsRef.current.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error encountered, trying to recover...');
              hlsRef.current.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              disconnectFromRadio();
              break;
          }
        }
      });

      // Добавляем обработчик успешной загрузки манифеста
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
        audioRef.current.play().catch(e => console.error('Play failed:', e));
      });

    } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      audioRef.current.src = '/api/radio/hls/playlist.m3u8';
      audioRef.current.addEventListener('loadedmetadata', () => {
        audioRef.current.play().catch(e => console.error('Play failed:', e));
      });
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
    lastSegmentRef.current = null;
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