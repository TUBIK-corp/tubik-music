import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [trackData, setTrackData] = useState({
    title: '',
    artist: ''
  });
  const [file, setFile] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      if (data.success) {
        setIsLoggedIn(true);
      } else {
        alert('Invalid password');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify(trackData));

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tracks`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        alert('Track uploaded successfully');
        setTrackData({ title: '', artist: '' });
        setFile(null);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upload Track</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            placeholder="Track Title"
            value={trackData.title}
            onChange={(e) => setTrackData({ ...trackData, title: e.target.value })}
          />
          
          <Input
            placeholder="Artist Name"
            value={trackData.artist}
            onChange={(e) => setTrackData({ ...trackData, artist: e.target.value })}
          />
          
          <Input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
          
          <Button type="submit" className="w-full">
            Upload Track
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;
