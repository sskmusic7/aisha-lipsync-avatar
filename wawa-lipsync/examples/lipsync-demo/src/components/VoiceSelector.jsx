import React, { useState, useEffect } from 'react';
import elevenLabsService from '../services/elevenLabsService';

export const VoiceSelector = ({ onVoiceChange, selectedVoiceId }) => {
  const [voices, setVoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // A.Isha's preferred ElevenLabs voices
  const defaultVoices = [
    {
      voice_id: 'vzb1D7zjti0h5u8StSra',
      name: 'A.Isha (Primary)',
      description: 'Smooth, expressive, perfect for A.Isha',
      labels: { gender: 'Female', accent: 'American' }
    },
    {
      voice_id: 'TfVjIROhkRShQb9pCFfK',
      name: 'Keke',
      description: 'Bold, sassy, Keke Palmer vibes',
      labels: { gender: 'Female', accent: 'American' }
    },
    {
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      name: 'Rachel',
      description: 'Warm, friendly American female',
      labels: { gender: 'Female', accent: 'American' }
    },
    {
      voice_id: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Bella',
      description: 'Young, energetic American female',
      labels: { gender: 'Female', accent: 'American' }
    }
  ];

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Always use our curated A.Isha voices instead of API voices
      console.log('🎤 Using curated A.Isha voices');
      setVoices(defaultVoices);
      
      // Set default voice if none selected (prioritize A.Isha's custom voice)
      if (!selectedVoiceId) {
        onVoiceChange(defaultVoices[0].voice_id); // A.Isha (Primary)
      }
    } catch (error) {
      console.warn('Failed to load voices, using defaults:', error);
      setError('Using default voices (API unavailable)');
      setVoices(defaultVoices);
      
      // Set default voice
      if (!selectedVoiceId) {
        onVoiceChange(defaultVoices[0].voice_id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceChange = (voiceId) => {
    onVoiceChange(voiceId);
  };

  const previewVoice = async (voiceId, voiceName) => {
    try {
      console.log('🎤 Previewing voice:', voiceName, 'ID:', voiceId);
      
      // Check if ElevenLabs service is available
      if (!elevenLabsService.apiKey) {
        console.log('🔑 Initializing ElevenLabs service...');
        await elevenLabsService.initialize();
      }
      
      const audioBlob = await elevenLabsService.textToSpeech(
        `Hi, I'm A.Isha. How can I help you today?`,
        { voiceId }
      );
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      console.log('✅ Voice preview successful');
    } catch (error) {
      console.error('❌ Failed to preview voice:', error);
      
      // More specific error message
      if (error.message.includes('API key')) {
        alert('ElevenLabs API key not found. Please check your environment variables.');
      } else if (error.message.includes('quota_exceeded')) {
        alert('Monthly character limit exceeded. Please upgrade your ElevenLabs plan.');
      } else if (error.message.includes('Invalid voice ID')) {
        alert('This voice is not available on your ElevenLabs plan. Try a different voice.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        alert('Network error. Please check your internet connection.');
      } else {
        alert(`Failed to preview voice: ${error.message}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="voice-selector">
        <h3>🎤 Loading Voices...</h3>
        <div className="loading-spinner">⏳</div>
      </div>
    );
  }

  return (
    <div className="voice-selector bg-white rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🎤 A.Isha's Voice</h3>
        {error && (
          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>
      
      <div className="voice-grid grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
        {voices.map(voice => (
          <div 
            key={voice.voice_id} 
            className={`voice-card border rounded-lg p-3 cursor-pointer transition-all ${
              selectedVoiceId === voice.voice_id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleVoiceChange(voice.voice_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id={voice.voice_id}
                  name="voice"
                  value={voice.voice_id}
                  checked={selectedVoiceId === voice.voice_id}
                  onChange={() => handleVoiceChange(voice.voice_id)}
                  className="text-blue-600"
                />
                <div>
                  <label htmlFor={voice.voice_id} className="font-medium text-gray-800 cursor-pointer">
                    {voice.name}
                  </label>
                  <div className="text-xs text-gray-500">
                    {voice.labels?.gender || voice.description} • {voice.labels?.accent || 'American'}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  previewVoice(voice.voice_id, voice.name);
                }}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                ▶️ Preview
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        💡 Tip: Preview voices to find the perfect one for A.Isha's personality!
      </div>
    </div>
  );
};
