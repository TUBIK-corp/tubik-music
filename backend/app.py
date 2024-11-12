from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
import uuid

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'storage/tracks'
DATABASE_FILE = 'storage/database.json'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def load_database():
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            return json.load(f)
    return {"tracks": []}

def save_database(data):
    with open(DATABASE_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    stored_hash = os.environ.get('ADMIN_PASSWORD_HASH')
    if check_password_hash(stored_hash, data.get('password')):
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route('/api/tracks', methods=['GET'])
def get_tracks():
    db = load_database()
    return jsonify(db['tracks'])

@app.route('/api/tracks', methods=['POST'])
def upload_track():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    track_data = json.loads(request.form.get('data'))
    
    track_id = str(uuid.uuid4())
    filename = f"{track_id}{os.path.splitext(file.filename)[1]}"
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    
    db = load_database()
    track_info = {
        "id": track_id,
        "title": track_data.get('title'),
        "artist": track_data.get('artist'),
        "filename": filename
    }
    db['tracks'].append(track_info)
    save_database(db)
    
    return jsonify(track_info)

@app.route('/api/tracks/<track_id>', methods=['GET'])
def get_track(track_id):
    db = load_database()
    track = next((t for t in db['tracks'] if t['id'] == track_id), None)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    
    return send_file(
        os.path.join(UPLOAD_FOLDER, track['filename']),
        mimetype='audio/mpeg'
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
