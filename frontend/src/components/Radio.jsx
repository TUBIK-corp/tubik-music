import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function Radio() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const [listeners, setListeners] = useState(0);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Создаем AudioContext при монтировании компонента
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    // Получаем информацию о текущем треке при загрузке
    fetchCurrentTrack();

    return () => {
      disconnectFromRadio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const fetchCurrentTrack = async () => {
    try {
      const response = await fetch('https://music.tubik-corp.ru/api/radio/current');
      if (!response.ok) throw new Error('Failed to fetch current track');
      const data = await response.json();
      setCurrentTrack(data);
    } catch (err) {
      setError('Не удалось получить информацию о текущем треке');
      console.error(err);
    }
  };

  const connectToRadio = () => {
    try {
      if (!isConnected) {
        // Инициализация WebSocket соединения
        socketRef.current = io('https://music.tubik-corp.ru/api/radio', {
          transports: ['websocket'],
          timeout: 10000,
        });

        socketRef.current.on('connect', () => {
          setIsConnected(true);
          setError(null);
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
          setCurrentTrack(null);
        });

        socketRef.current.on('track_change', (trackInfo) => {
          setCurrentTrack(trackInfo);
        });

        socketRef.current.on('listeners_update', (count) => {
          setListeners(count);
        });

        socketRef.current.on('audio_chunk', (data) => {
          try {
            const arrayBuffer = new Uint8Array(data.data.match(/.{1,2}/g)
              .map(byte => parseInt(byte, 16))).buffer;

            audioContextRef.current.decodeAudioData(arrayBuffer)
              .then(decodedData => {
                const source = audioContextRef.current.createBufferSource();
                source.buffer = decodedData;
                source.connect(audioContextRef.current.destination);
                source.start(0);
              })
              .catch(err => {
                console.error('Error decoding audio data:', err);
              });
          } catch (err) {
            console.error('Error processing audio chunk:', err);
          }
        });

        socketRef.current.on('error', (error) => {
          setError('Ошибка подключения к радио');
          console.error('Socket error:', error);
          disconnectFromRadio();
        });

      } else {
        disconnectFromRadio();
      }
    } catch (err) {
      setError('Не удалось подключиться к радио');
      console.error('Connection error:', err);
    }
  };

  const disconnectFromRadio = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  };

  return (
    <div className="radio-container">
      <div className="radio-wave-animation" />
      <div className="radio-player">
        <div className="radio-status">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'В эфире' : 'Не подключено'}</span>
          {isConnected && <span className="listeners-count">Слушателей: {listeners}</span>}
        </div>

        <div className="radio-image-container">
          <img 
            src={currentTrack?.imageUrl || "/default-radio.jpg"} 
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
            disabled={!!error}
          >
            {isConnected ? 'Отключиться' : 'Подключиться'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Radio;