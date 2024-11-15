from flask import Flask, request, jsonify, send_file, Response
import m3u8
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
import tempfile
import time
import queue

app = Flask(__name__)

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
        self.playlist_file = tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt')
        self.playlist_update_event = threading.Event()
        
    def start_streaming(self):
        if not self.is_running and self._has_tracks():
            self.is_running = True
            threading.Thread(target=self._stream_manager).start()
            threading.Thread(target=self._playlist_updater).start()
            return True
        return False

    def _has_tracks(self):
        tracks = load_tracks()
        return len(tracks) > 0

    def _stream_manager(self):
        output_pattern = f"{HLS_SEGMENTS_DIR}/segment_%03d.ts"
        playlist_path = f"{HLS_SEGMENTS_DIR}/{HLS_PLAYLIST_FILE}"
        
        command = [
            'ffmpeg',
            '-re',
            '-f', 'concat',
            '-safe', '0',
            '-i', self.playlist_file.name,
            '-c:a', 'aac',
            '-b:a', FFMPEG_BITRATE,
            '-f', 'hls',
            '-hls_time', str(HLS_SEGMENT_LENGTH),
            '-hls_list_size', '10',
            '-hls_flags', 'delete_segments+append_list',
            '-hls_segment_filename', output_pattern,
            playlist_path
        ]
        
        while self.is_running:
            self.current_process = subprocess.Popen(command)
            self.current_process.wait()

    def _playlist_updater(self):
        while self.is_running:
            tracks = load_tracks()
            random.shuffle(tracks)
            self.playlist_file.seek(0)
            self.playlist_file.truncate()
            for track in tracks:
                track_path = f"{UPLOAD_FOLDER}/{track['id']}.mp3"
                self.playlist_file.write(f"file '{track_path}'\n")
            self.playlist_file.flush()
            self.current_track_info = tracks[0] if tracks else None
            self.playlist_update_event.set()
            time.sleep(60)  # Обновляем плейлист каждую минуту

    def get_current_track(self):
        return self.current_track_info

    def stop_streaming(self):
        self.is_running = False
        if self.current_process:
            self.current_process.terminate()
        os.unlink(self.playlist_file.name)

radio = RadioStream()



def cleanup_resources():
    radio.cleanup()
    
def load_tracks():
    if os.path.exists(TRACKS_FILE):
        with open(TRACKS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_tracks(tracks):
    with open(TRACKS_FILE, 'w') as f:
        json.dump(tracks, f)


@app.route('/api/radio/hls/playlist.m3u8')
def get_playlist():
    playlist_path = f"{HLS_SEGMENTS_DIR}/{HLS_PLAYLIST_FILE}"
    if os.path.exists(playlist_path):
        return send_file(playlist_path, mimetype='application/vnd.apple.mpegurl')
    return '', 404

@app.route('/api/radio/hls/<segment>')
def get_segment(segment):
    segment_path = f"{HLS_SEGMENTS_DIR}/{segment}"
    if os.path.exists(segment_path):
        return send_file(segment_path, mimetype='video/MP2T')
    return '', 404

@app.route('/api/radio/status')
def get_radio_status():
    return jsonify({
        'is_running': radio.is_running,
        'has_tracks': radio._has_tracks(),
        'current_track': radio.current_track_info
    })

@app.route('/api/radio/current', methods=['GET'])
def get_current_track():
    return jsonify(radio.current_track_info)

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

    # Если это первый трек и радио не запущено, запускаем его
    if len(tracks) == 1 and not radio.is_running:
        radio.start_streaming()

    return jsonify({'success': True})

radio = RadioStream()


def cleanup_resources():
    radio.stop_streaming()


# Обработчик для корректного завершения работы
import atexit
atexit.register(cleanup_resources)

if __name__ == '__main__':
    if radio._has_tracks():
        radio.start_streaming()
        time.sleep(2)
    app.run(host='0.0.0.0', port=5000)