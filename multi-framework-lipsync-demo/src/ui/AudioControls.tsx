import React, { useState, useRef, useEffect } from 'react';
import { LipsyncManager } from '@/core/LipsyncManager';

interface AudioControlsProps {
  lipsyncManager: LipsyncManager;
  disabled?: boolean;
}

// Sample audio files for demo
const sampleAudios = [
  { name: 'Vowels (A, E, I, O, U)', path: '/audio/vowels.mp3' },
  { name: 'Consonants (P, B, T, D)', path: '/audio/consonants.mp3' },
  { name: 'Speech Sample', path: '/audio/speech.mp3' },
  { name: 'Numbers (1-10)', path: '/audio/numbers.mp3' }
];

export const AudioControls: React.FC<AudioControlsProps> = ({
  lipsyncManager,
  disabled = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [volume, setVolume] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // const [isRecording, setIsRecording] = useState(false);
  const [isMicConnected, setIsMicConnected] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Update playback state
  useEffect(() => {
    const updateState = () => {
      setIsPlaying(lipsyncManager.isPlaying);
      setCurrentTime(lipsyncManager.currentTime);
      setDuration(lipsyncManager.duration);
    };

    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, [lipsyncManager]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = URL.createObjectURL(file);
      await connectAudio(url, file.name);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('Failed to load audio file. Please try a different file.');
    }
  };

  const handleSampleAudio = async (audioPath: string, name: string) => {
    try {
      await connectAudio(audioPath, name);
    } catch (error) {
      console.error('Failed to load sample audio:', error);
      alert('Failed to load sample audio. The file may not be available.');
    }
  };

  const connectAudio = async (source: string, name: string) => {
    try {
      await lipsyncManager.connectAudio(source);
      setCurrentAudio(name);
      audioElementRef.current = lipsyncManager['audioElement']; // Access private property
      
      if (audioElementRef.current) {
        audioElementRef.current.volume = volume;
      }
    } catch (error) {
      throw error;
    }
  };

  const handlePlay = async () => {
    try {
      await lipsyncManager.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      alert('Failed to play audio. Please check your audio settings.');
    }
  };

  const handlePause = () => {
    lipsyncManager.pause();
  };

  const handleStop = () => {
    lipsyncManager.stop();
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioElementRef.current) {
      audioElementRef.current.volume = newVolume;
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = newTime;
    }
  };

  const handleMicrophoneToggle = async () => {
    if (isMicConnected) {
      // Disconnect microphone
      lipsyncManager.disconnectAudio();
      setIsMicConnected(false);
      setCurrentAudio(null);
    } else {
      try {
        await lipsyncManager.connectMicrophone();
        setIsMicConnected(true);
        setCurrentAudio('🎤 Microphone');
      } catch (error) {
        console.error('Failed to connect microphone:', error);
        alert('Failed to access microphone. Please check your permissions.');
      }
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-controls\">
      <h3>🎵 Audio Controls</h3>
      
      {/* Current Audio Display */}
      {currentAudio && (
        <div className="current-audio\">
          <strong>Current: </strong>
          <span>{currentAudio}</span>
        </div>
      )}

      {/* File Upload */}
      <div className="file-upload">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          disabled={disabled}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="upload-button"
        >
          📁 Upload Audio File
        </button>
      </div>

      {/* Sample Audio Files */}
      <div className="sample-audios">
        <h4>Sample Audio Files:</h4>
        <div className="sample-buttons">
          {sampleAudios.map((audio) => (
            <button
              key={audio.path}
              onClick={() => handleSampleAudio(audio.path, audio.name)}
              disabled={disabled}
              className="sample-button\"
            >
              {audio.name}
            </button>
          ))}
        </div>
      </div>

      {/* Microphone */}
      <div className="microphone-section\">
        <button
          onClick={handleMicrophoneToggle}
          disabled={disabled}
          className={`mic-button ${isMicConnected ? 'active' : ''}`}
        >
          {isMicConnected ? '🎤 Disconnect Mic' : '🎤 Use Microphone'}
        </button>
      </div>

      {/* Playback Controls */}
      {currentAudio && !isMicConnected && (
        <div className="playback-controls\">
          <div className="control-buttons\">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={disabled}
              className="play-pause-button\"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="stop-button\"
            >
              ⏹️
            </button>
          </div>

          {/* Progress Bar */}
          <div className="progress-section\">
            <span className="time-display\">{formatTime(currentTime)}</span>
            <input
              type="range\"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              disabled={disabled}
              className="progress-bar\"
            />
            <span className="time-display\">{formatTime(duration)}</span>
          </div>

          {/* Volume Control */}
          <div className="volume-section\">
            <span>🔊</span>
            <input
              type="range\"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              disabled={disabled}
              className="volume-slider\"
            />
            <span>{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
