import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function Radio() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const [listeners, setListeners] = useState(0);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const audioBufferQueueRef = useRef([]);
  const schedulerIntervalRef = useRef(null);
  const SCHEDULE_AHEAD_TIME = 1; // Планирование на 1 секунду вперед
  const SCHEDULER_INTERVAL = 100; // Интервал планировщика 100ms

  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    } catch (err) {
      console.error('Error initializing Audio Context:', err);
      setError('Ошибка инициализации аудио');
    }

    fetchCurrentTrack();

    return () => {
      disconnectFromRadio();
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }
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

  const scheduleAudioChunk = (audioBuffer, startTime) => {
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNodeRef.current);
    source.start(startTime);
    return source.buffer.duration;
  };

  const audioScheduler = () => {
    const currentTime = audioContextRef.current.currentTime;
    while (
      audioBufferQueueRef.current.length > 0 &&
      nextPlayTimeRef.current < currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const nextBuffer = audioBufferQueueRef.current.shift();
      const source = audioContextRef.current.createBufferSource();
      source.buffer = nextBuffer;
      source.connect(gainNodeRef.current);
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += nextBuffer.duration;
    }
  };

  const processAudioChunk = async (data) => {
    try {
      if (!data || !data.data) return;
  
      const arrayBuffer = new Uint8Array(
        data.data.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      ).buffer;
  
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferQueueRef.current.push(audioBuffer);
  
    } catch (err) {
      console.error('Error processing audio chunk:', err);
    }
  };

  const connectToRadio = async () => {
    try {
      if (!isConnected) {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Сброс времени воспроизведения
        nextPlayTimeRef.current = audioContextRef.current.currentTime;
        audioBufferQueueRef.current = [];

        // Запуск планировщика
        schedulerIntervalRef.current = setInterval(audioScheduler, SCHEDULER_INTERVAL);

        socketRef.current = io('https://music.tubik-corp.ru', {
          path: '/socket.io/',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
          setIsConnected(true);
          setError(null);
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
          setCurrentTrack(null);
          audioBufferQueueRef.current = [];
        });

        socketRef.current.on('track_change', (trackInfo) => {
          setCurrentTrack(trackInfo);
          // Сброс очереди и времени при смене трека
          audioBufferQueueRef.current = [];
          nextPlayTimeRef.current = audioContextRef.current.currentTime;
        });

        socketRef.current.on('listeners_update', (count) => {
          setListeners(count);
        });

        socketRef.current.on('audio_chunk', processAudioChunk);

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

    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }

    audioBufferQueueRef.current = [];
    nextPlayTimeRef.current = audioContextRef.current.currentTime;
    setIsConnected(false);
  };

  // Добавляем обработчик для автоматического возобновления AudioContext
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (error) {
          console.error('Error resuming AudioContext:', error);
        }
      }
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

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