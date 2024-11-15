from flask import Flask, request, jsonify, send_file, Response
import m3u8
from flask_socketio import SocketIO, emit
import json
import hashlib
import os
import random
import threading
from pathlib import Path
import subprocess
import shutil
from pydub import AudioSegment
from pydub.utils import make_chunks
from werkzeug.utils import secure_filename
import time
import queue

app = Flask(__name__)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False
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

HLS_SEGMENT_LENGTH = 10  # длина сегмента в секундах
HLS_SEGMENTS_DIR = 'data/hls'
HLS_PLAYLIST_FILE = 'playlist.m3u8'
FFMPEG_BITRATE = '128k'

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)
os.makedirs(HLS_SEGMENTS_DIR, exist_ok=True)


class RadioStream:
    def __init__(self):
        self.current_track_info = None
        self.played_tracks = set()
        self.is_running = False
        self.current_process = None
        self.playlist = []
        self.segment_count = 0
        
    def start_streaming(self):
        self.is_running = True
        threading.Thread(target=self._stream_manager).start()

    def _stream_manager(self):
        while self.is_running:
            if not self.current_process or self.current_process.poll() is not None:
                track_path, track_info = self.get_random_track()
                if track_path:
                    self.current_track_info = track_info
                    self._start_ffmpeg_stream(track_path)
            time.sleep(1)

    def _start_ffmpeg_stream(self, input_file):
        if self.current_process:
            self.current_process.terminate()
            
        output_pattern = f"{HLS_SEGMENTS_DIR}/segment_%03d.ts"
        playlist_path = f"{HLS_SEGMENTS_DIR}/{HLS_PLAYLIST_FILE}"
        
        command = [
            'ffmpeg', '-re', '-i', input_file,
            '-c:a', 'aac', '-b:a', FFMPEG_BITRATE,
            '-f', 'hls',
            '-hls_time', str(HLS_SEGMENT_LENGTH),
            '-hls_list_size', '6',
            '-hls_flags', 'delete_segments',
            '-hls_segment_filename', output_pattern,
            playlist_path
        ]
        
        self.current_process = subprocess.Popen(command)

    def get_random_track(self):
        # Оставляем текущую логику выбора случайного трека
        tracks = load_tracks()
        if not tracks:
            return None, None

        available_tracks = [t for t in tracks if t['id'] not in self.played_tracks]
        if not available_tracks:
            self.played_tracks.clear()
            available_tracks = tracks

        track = random.choice(available_tracks)
        self.played_tracks.add(track['id'])
        track_path = f"{UPLOAD_FOLDER}/{track['id']}.mp3"
        
        if not os.path.exists(track_path):
            return None, None
            
        return track_path, track

radio = RadioStream()

@app.route('/api/radio/stream/playlist.m3u8')
def get_playlist():
    playlist_path = f"{HLS_SEGMENTS_DIR}/{HLS_PLAYLIST_FILE}"
    if os.path.exists(playlist_path):
        return send_file(playlist_path, mimetype='application/vnd.apple.mpegurl')
    return '', 404

@app.route('/api/radio/stream/<segment>')
def get_segment(segment):
    segment_path = f"{HLS_SEGMENTS_DIR}/{segment}"
    if os.path.exists(segment_path):
        return send_file(segment_path, mimetype='video/MP2T')
    return '', 404

@app.route('/api/radio/current', methods=['GET'])
def get_current_track():
    return jsonify(radio.current_track_info)

def cleanup_resources():
    radio.cleanup()
    
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
    radio.clients.add(request.sid)
    print(f"Client connected. Total clients: {len(radio.clients)}")
    
    if len(radio.clients) == 1:
        radio.current_thread = threading.Thread(target=radio.stream_audio)
        radio.current_thread.start()
    
    # Отправка начальных 5 секунд аудио
    initial_chunks = radio.get_initial_chunks(5)
    combined_chunk = AudioSegment.empty()
    for chunk in initial_chunks:
        combined_chunk += chunk

    if len(combined_chunk) > 0:
        audio_data = {
            'data': combined_chunk.raw_data.hex(),
            'sample_rate': radio.player.sample_rate,
            'channels': radio.player.channels,
            'duration': len(combined_chunk) / 1000  # длительность в секундах
        }
        emit('initial_audio_chunk', audio_data)
    
    radio.notify_listeners_count()
    if radio.player.current_track_info:
        emit('track_change', radio.player.current_track_info)

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in radio.clients:
        radio.clients.remove(request.sid)
    print(f"Client disconnected. Total clients: {len(radio.clients)}")
    
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
    radio.start_streaming()
    app.run(host='0.0.0.0', port=5000)