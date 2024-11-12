import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

const MusicPlayer = () => {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio());

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tracks`);
      const data = await response.json();
      setTracks(data);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  useEffect(() => {
    if (tracks.length > 0) {
      audio.src = `${process.env.REACT_APP_API_URL}/api/tracks/${tracks[currentTrackIndex].id}`;
      if (isPlaying) {
        audio.play();
      }
    }
  }, [currentTrackIndex, tracks]);

  const togglePlay = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    setCurrentTrackIndex((prevIndex) => 
      prevIndex + 1 >= tracks.length ? 0 : prevIndex + 1
    );
  };

  const playPrevious = () => {
    setCurrentTrackIndex((prevIndex) => 
      prevIndex - 1 < 0 ? tracks.length - 1 : prevIndex - 1
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">
            {tracks[currentTrackIndex]?.title || 'No track selected'}
          </h2>
          <p className="text-gray-600">
            {tracks[currentTrackIndex]?.artist || ''}
          </p>
        </div>
        
        <div className="flex justify-center items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={playPrevious}
            className="rounded-full"
          >
            <SkipBack className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="default"
            size="icon"
            onClick={togglePlay}
            className="rounded-full w-12 h-12"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          
          <Button 
            variant="outline"
            size="icon"
            onClick={playNext}
            className="rounded-full"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
