// ElevenLabs Text-to-Speech Service
// This service handles high-quality voice synthesis using ElevenLabs API

class ElevenLabsService {
  constructor() {
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    this.apiUrl = 'https://api.elevenlabs.io/v1';
    
    // Default voice settings for natural speech
    this.voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };
    
    // Audio cache to reduce API costs
    this.audioCache = new Map();
    this.maxCacheSize = 50;
  }

  // Initialize with API key
  async initialize() {
    // Priority 1: Environment variable (set in Netlify)
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    
    if (this.apiKey) {
      console.log('✅ Using ElevenLabs API key from environment variables');
      return true;
    }
    
    // Priority 2: localStorage (for local development)
    this.apiKey = localStorage.getItem('elevenlabs-api-key');
    
    if (this.apiKey) {
      console.log('✅ Using ElevenLabs API key from localStorage');
      return true;
    }
    
    // No API key available
    console.warn('⚠️ No ElevenLabs API key found. Using Web Speech API fallback. Set VITE_ELEVENLABS_API_KEY in Netlify environment variables for high-quality voices.');
    return false;
  }

  // Basic text-to-speech conversion
  async textToSpeech(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not available');
    }

    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
    const url = `${this.apiUrl}/text-to-speech/${voiceId}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options.modelId || 'eleven_monolingual_v1',
          voice_settings: options.voiceSettings || this.voiceSettings
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return audioBlob;
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }

  // Text-to-speech with timestamps for lipsync
  async textToSpeechWithTimestamps(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not available');
    }

    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
    const url = `${this.apiUrl}/text-to-speech/${voiceId}/with-timestamps`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options.modelId || 'eleven_monolingual_v1',
          voice_settings: options.voiceSettings || this.voiceSettings
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert base64 audio to blob
      const audioBlob = this.base64ToBlob(data.audio_base64, 'audio/mpeg');
      
      return {
        audio: audioBlob,
        alignment: data.alignment // Contains word timestamps for lipsync
      };
    } catch (error) {
      console.error('ElevenLabs TTS with timestamps error:', error);
      throw error;
    }
  }

  // Get available voices
  async getVoices() {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not available');
    }

    const url = `${this.apiUrl}/voices`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  // Convert base64 to blob
  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Cached text-to-speech to reduce API costs
  async textToSpeechCached(text, options = {}) {
    const cacheKey = this.getCacheKey(text, options.voiceId);
    const cached = this.audioCache.get(cacheKey);
    
    if (cached) {
      console.log('🎵 Using cached audio for:', text.substring(0, 50) + '...');
      return cached;
    }
    
    const audioBlob = await this.textToSpeech(text, options);
    
    // Implement LRU cache
    if (this.audioCache.size >= this.maxCacheSize) {
      const firstKey = this.audioCache.keys().next().value;
      this.audioCache.delete(firstKey);
    }
    
    this.audioCache.set(cacheKey, audioBlob);
    return audioBlob;
  }

  getCacheKey(text, voiceId) {
    return `${voiceId || 'default'}-${text.substring(0, 100)}`;
  }

  // Clear API key
  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('elevenlabs-api-key');
  }
}

export default new ElevenLabsService();
