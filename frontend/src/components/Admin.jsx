import React, { useState } from 'react';

function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [file, setFile] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        setIsLoggedIn(true);
      } else {
        alert('Wrong password');
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !artist) {
      alert('Please fill all fields');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify({ title, artist }));

    try {
      const res = await fetch('http://localhost:5000/api/tracks', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('Track uploaded!');
        setTitle('');
        setArtist('');
        setFile(null);
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2>Upload Track</h2>
      <form onSubmit={handleUpload}>
        <div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Track title"
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            placeholder="Artist name"
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="file"
            onChange={e => setFile(e.target.files[0])}
            accept="audio/*"
          />
        </div>
        <button type="submit" style={{ marginTop: '10px' }}>Upload</button>
      </form>
    </div>
  );
}

export default Admin;
