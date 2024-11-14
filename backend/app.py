from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit
import json
import hashlib
import os
import random
import time
import threading
from pydub import AudioSegment
from werkzeug.utils import secure_filename

app = Flask(__name__)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    ping_timeout=60,
    ping_interval=25,
    logger=True,
    engineio_logger=True
)

# Constants
SAMPLE_RATE = 44100
CHANNELS = 2
CHUNK_DURATION = 0.1  # длительность чанка в секундах
BUFFER_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)  # размер буфера
UPLOAD_FOLDER = 'data/uploads'
IMAGES_FOLDER = 'data/images'
TRACKS_FILE = 'data/tracks.json'
ADMIN_HASH = hashlib.sha256('tubik123'.encode()).hexdigest()
DEFAULT_IMAGE = 'default.jpg'
# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)

class AudioPlayer:
    def __init__(self):
        self.current_segment = None
        self.position = 0
        self.is_playing = False
        self.audio_queue = queue.Queue()
        self.current_track_info = None

    def load_track(self, track_path, track_info):
        """Загружает трек и подготавливает его к воспроизведению"""
        try:
            self.current_segment = AudioSegment.from_file(track_path)
            self.current_segment = self.current_segment.set_channels(CHANNELS)
            self.current_segment = self.current_segment.set_frame_rate(SAMPLE_RATE)
            self.position = 0
            self.current_track_info = track_info
            return True
        except Exception as e:
            print(f"Error loading track: {e}")
            return False

    def get_next_chunk(self):
        """Получает следующий чанк аудио"""
        if not self.current_segment:
            return None

        chunk_ms = int(CHUNK_DURATION * 1000)
        start_ms = int(self.position * 1000)
        end_ms = start_ms + chunk_ms

        if start_ms >= len(self.current_segment):
            return None

        chunk = self.current_segment[start_ms:end_ms]
        self.position += CHUNK_DURATION
        return chunk

    def reset(self):
        """Сбрасывает текущее состояние плеера"""
        self.current_segment = None
        self.position = 0
        self.current_track_info = None

class RadioStream:
    def __init__(self):
        self.clients = set()
        self.played_tracks = set()
        self.current_thread = None
        self.player = AudioPlayer()
        self.is_running = False

    def get_random_track(self):
        """Выбирает случайный трек из доступных"""
        tracks = load_tracks()
        if not tracks:
            return None, None

        available_tracks = [t for t in tracks if t['id'] not in self.played_tracks]
        if not available_tracks:
            self.played_tracks.clear()
            available_tracks = tracks

        track = random.choice(available_tracks)
        self.played_tracks.add(track['id'])
        return f"{UPLOAD_FOLDER}/{track['id']}.mp3", track

    def notify_track_change(self):
        """Уведомляет клиентов о смене трека"""
        if self.player.current_track_info:
            socketio.emit('track_change', self.player.current_track_info)

    def notify_listeners_count(self):
        """Уведомляет о количестве слушателей"""
        socketio.emit('listeners_update', len(self.clients))

    def stream_audio(self):
        """Основной метод стриминга аудио"""
        self.is_running = True
        
        while self.is_running and self.clients:
            # Если нет текущего трека, загружаем новый
            if not self.player.current_segment:
                track_path, track_info = self.get_random_track()
                if not track_path or not self.player.load_track(track_path, track_info):
                    continue
                self.notify_track_change()

            # Получаем следующий чанк аудио
            chunk = self.player.get_next_chunk()
            if chunk is None:
                # Трек закончился, сбрасываем состояние
                self.player.reset()
                continue

            # Отправляем аудио данные клиентам
            try:
                audio_data = {
                    'data': chunk.raw_data.hex(),
                    'sample_rate': SAMPLE_RATE,
                    'channels': CHANNELS,
                    'duration': CHUNK_DURATION
                }
                socketio.emit('audio_chunk', audio_data)
            except Exception as e:
                print(f"Error sending audio chunk: {e}")
                continue

def load_tracks():
    """Загружает список треков из файла"""
    if os.path.exists(TRACKS_FILE):
        with open(TRACKS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_tracks(tracks):
    """Сохраняет список треков в файл"""
    with open(TRACKS_FILE, 'w') as f:
        json.dump(tracks, f)

# API Routes
@app.route('/api/radio/current', methods=['GET'])
def get_current_track():
    return jsonify(radio.player.current_track_info)

@app.route('/api/radio/listeners', methods=['GET'])
def get_listeners_count():
    return jsonify({'count': len(radio.clients)})

@app.route('/api/tracks', methods=['GET'])
def get_tracks():
    return jsonify(load_tracks())

@app.route('/api/tracks/<track_id>', methods=['GET'])
def get_track(track_id):
    return send_file(f'{UPLOAD_FOLDER}/{track_id}.mp3')

@app.route('/api/images/<filename>', methods=['GET'])
def get_image(filename):
    try:
        return send_file(f'{IMAGES_FOLDER}/{filename}')
    except:
        return send_file(f'{IMAGES_FOLDER}/{DEFAULT_IMAGE}')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
    if password_hash == ADMIN_HASH:
        return jsonify({'success': True})
    return jsonify({'success': False}), 401

@app.route('/api/upload', methods=['POST'])
def upload_track():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    image = request.files.get('image')
    title = request.form.get('title', '')
    artist = request.form.get('artist', '')

    tracks = load_tracks()
    track_id = str(len(tracks) + 1)

    # Save audio file
    file.save(f'{UPLOAD_FOLDER}/{track_id}.mp3')

    # Handle image
    image_filename = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png']:
            image_filename = f'track_{track_id}{ext}'
            image.save(os.path.join(IMAGES_FOLDER, image_filename))

    tracks.append({
        'id': track_id,
        'title': title,
        'artist': artist,
        'imageUrl': f'/api/images/{image_filename}' if image_filename else f'/api/images/{DEFAULT_IMAGE}'
    })
    save_tracks(tracks)
    return jsonify({'success': True})

# WebSocket Events
radio = RadioStream()


@socketio.on('connect')
def handle_connect():
    """Обработка подключения клиента"""
    radio.clients.add(request.sid)
    print(f"Client connected. Total clients: {len(radio.clients)}")
    
    # Запускаем стриминг, если это первый клиент
    if len(radio.clients) == 1:
        radio.current_thread = threading.Thread(target=radio.stream_audio)
        radio.current_thread.start()
    
    radio.notify_listeners_count()
    if radio.player.current_track_info:
        emit('track_change', radio.player.current_track_info)

@socketio.on('disconnect')
def handle_disconnect():
    """Обработка отключения клиента"""
    if request.sid in radio.clients:
        radio.clients.remove(request.sid)
    print(f"Client disconnected. Total clients: {len(radio.clients)}")
    
    # Останавливаем стриминг, если нет клиентов
    if len(radio.clients) == 0:
        radio.is_running = False
        if radio.current_thread:
            radio.current_thread.join()
        radio.player.reset()
    
    radio.notify_listeners_count()

# Дополнительные функции управления радио
@socketio.on('skip_track')
def handle_skip_track():
    """Пропуск текущего трека"""
    radio.player.reset()

@socketio.on('volume_change')
def handle_volume_change(data):
    """Изменение громкости (если необходимо)"""
    volume = float(data.get('volume', 1.0))
    # Можно добавить логику изменения громкости

def cleanup_resources():
    """Очистка ресурсов при завершении работы"""
    radio.is_running = False
    if radio.current_thread:
        radio.current_thread.join()
    radio.player.reset()

# Обработчик для корректного завершения работы
import atexit
atexit.register(cleanup_resources)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)