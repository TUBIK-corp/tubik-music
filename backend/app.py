# backend/app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import hashlib
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'data/uploads'
IMAGES_FOLDER = 'data/images'
TRACKS_FILE = 'data/tracks.json'
ADMIN_HASH = hashlib.sha256('tubik123'.encode()).hexdigest()
DEFAULT_IMAGE = 'default.jpg'

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)

def load_tracks():
    if os.path.exists(TRACKS_FILE):
        with open(TRACKS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_tracks(tracks):
    with open(TRACKS_FILE, 'w') as f:
        json.dump(tracks, f)

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

@app.route('/api/tracks/<track_id>', methods=['PUT'])
def update_track(track_id):
    tracks = load_tracks()
    track_index = next((i for i, track in enumerate(tracks) if track['id'] == track_id), None)
    
    if track_index is None:
        return jsonify({'error': 'Track not found'}), 404
    
    title = request.form.get('title')
    artist = request.form.get('artist')
    image = request.files.get('image')
    
    if title:
        tracks[track_index]['title'] = title
    if artist:
        tracks[track_index]['artist'] = artist
        
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png']:
            # Remove old image if exists
            old_image = tracks[track_index].get('imageUrl')
            if old_image:
                old_filename = old_image.split('/')[-1]
                try:
                    os.remove(os.path.join(IMAGES_FOLDER, old_filename))
                except:
                    pass
                    
            # Save new image
            image_filename = f'track_{track_id}{ext}'
            image.save(os.path.join(IMAGES_FOLDER, image_filename))
            tracks[track_index]['imageUrl'] = f'/api/images/{image_filename}'
    
    save_tracks(tracks)
    return jsonify({'success': True})

@app.route('/api/tracks/<track_id>', methods=['DELETE'])
def delete_track(track_id):
    tracks = load_tracks()
    track_index = next((i for i, track in enumerate(tracks) if track['id'] == track_id), None)
    
    if track_index is None:
        return jsonify({'error': 'Track not found'}), 404
        
    # Remove files
    try:
        os.remove(f'{UPLOAD_FOLDER}/{track_id}.mp3')
        image_url = tracks[track_index].get('imageUrl')
        if image_url:
            image_filename = image_url.split('/')[-1]
            os.remove(os.path.join(IMAGES_FOLDER, image_filename))
    except:
        pass
    
    # Remove from tracks list
    tracks.pop(track_index)
    save_tracks(tracks)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
