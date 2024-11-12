import React from 'react';
import MusicPlayer from '../components/MusicPlayer';

const Home = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">TUBIK Music Player</h1>
      <MusicPlayer />
    </div>
  );
};

export default Home;
