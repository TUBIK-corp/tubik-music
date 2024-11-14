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
socketio = SocketIO(app, cors_allowed_origins="*")

# Constants
CHUNK_SIZE = 1024
UPLOAD_FOLDER = 'data/uploads'
IMAGES_FOLDER = 'data/images'
TRACKS_FILE = 'data/tracks.json'
ADMIN_HASH = hashlib.sha256('tubik123'.encode()).hexdigest()
DEFAULT_IMAGE = 'default.jpg'

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)

class RadioStream:
    def __init__(self):
        self.is_playing = False
        self.current_track = None
        self.current_track_info = None
        self.clients = set()
        self.played_tracks = set()
        self.current_thread = None

    def get_random_track(self):
        tracks = load_tracks()
        if not tracks:
            return None
            
        available_tracks = [t for t in tracks if t['id'] not in self.played_tracks]
        if not available_tracks:
            self.played_tracks.clear()
            available_tracks = tracks

        track = random.choice(available_tracks)
        self.played_tracks.add(track['id'])
        self.current_track_info = track
        return f"{UPLOAD_FOLDER}/{track['id']}.mp3"

    def notify_track_change(self):
        if self.current_track_info:
            socketio.emit('track_change', self.current_track_info)

    def notify_listeners_count(self):
        socketio.emit('listeners_update', len(self.clients))

    def stream_audio(self):
        while self.is_playing:
            if not self.clients:
                self.is_playing = False
                break

            if not self.current_track:
                self.current_track = self.get_random_track()
                if not self.current_track:
                    time.sleep(1)
                    continue
                self.notify_track_change()

            try:
                audio = AudioSegment.from_file(self.current_track)
                raw_data = audio.raw_data

                for i in range(0, len(raw_data), CHUNK_SIZE):
                    if not self.is_playing or not self.clients:
                        break
                    chunk = raw_data[i:i + CHUNK_SIZE]
                    socketio.emit('audio_chunk', {'data': chunk.hex()})
                    time.sleep(0.1)

                print(f"Track finished: {self.current_track}")
                self.current_track = None
                self.current_track_info = None

            except Exception as e:
                print(f"Error streaming track: {e}")
                self.current_track = None
                self.current_track_info = None
                continue

def load_tracks():
    if os.path.exists(TRACKS_FILE):
        with open(TRACKS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_tracks(tracks):
    with open(TRACKS_FILE, 'w') as f:
        json.dump(tracks, f)

# API Routes
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
        'imageUrl': f'/api/images/{image_filename}' if image_filename else None
    })
    save_tracks(tracks)
    return jsonify({'success': True})

# WebSocket Events
radio = RadioStream()

@socketio.on('connect')
def handle_connect():
    radio.clients.add(request.sid)
    print(f"Client connected. Total clients: {len(radio.clients)}")
    
    if not radio.is_playing and len(radio.clients) == 1:
        radio.is_playing = True
        radio.current_thread = threading.Thread(target=radio.stream_audio)
        radio.current_thread.start()
    
    radio.notify_listeners_count()
    if radio.current_track_info:
        emit('track_change', radio.current_track_info)

@socketio.on('disconnect')
def handle_disconnect():
    radio.clients.remove(request.sid)
    print(f"Client disconnected. Total clients: {len(radio.clients)}")
    
    if len(radio.clients) == 0:
        radio.is_playing = False
        if radio.current_thread:
            radio.current_thread.join()
    
    radio.notify_listeners_count()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)