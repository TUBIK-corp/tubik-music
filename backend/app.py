# backend/app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import hashlib
import os

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'data/uploads'
TRACKS_FILE = 'data/tracks.json'
ADMIN_HASH = hashlib.sha256('tubik123'.encode()).hexdigest()

def load_tracks():
    if os.path.exists(TRACKS_FILE):
        with open(TRACKS_FILE, 'r') as f:
            return json.load(f)
    return []

@app.route('/api/tracks', methods=['GET'])
def get_tracks():
    return jsonify(load_tracks())

@app.route('/api/tracks/<track_id>', methods=['GET'])
def get_track(track_id):
    return send_file(f'{UPLOAD_FOLDER}/{track_id}.mp3')

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
    title = request.form.get('title', '')
    
    tracks = load_tracks()
    track_id = str(len(tracks) + 1)
    
    file.save(f'{UPLOAD_FOLDER}/{track_id}.mp3')
    
    tracks.append({
        'id': track_id,
        'title': title
    })
    
    with open(TRACKS_FILE, 'w') as f:
        json.dump(tracks, f)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
