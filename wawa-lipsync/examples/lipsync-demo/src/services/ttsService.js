// Google Cloud Text-to-Speech Service
// This service handles text-to-speech conversion using Google Cloud TTS API

class TTSService {
  constructor() {
    this.apiKey = null;
    this.baseURL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
    this.fallbackEnabled = true; // Use Web Speech API as fallback
  }

  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Initialize with API key
  async initialize() {
    // Try to get API key from environment first
    this.apiKey = import.meta.env.VITE_GCP_TTS_API_KEY;
    
    if (!this.apiKey) {
      // If no environment variable, check localStorage
      this.apiKey = localStorage.getItem('gcp-tts-api-key');
      
      // For now, we'll use the fallback Web Speech API if no GCP key is available
      // Later, we can prompt for the key like we do with Gemini
      console.log('No GCP TTS API key found. Using Web Speech API fallback.');
    }
    
    return true; // Always return true since we have fallback
  }

  // Clear stored API key
  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('gcp-tts-api-key');
  }

  // Convert text to speech using Google Cloud TTS
  async synthesizeSpeechGCP(text, voiceConfig = {}) {
    if (!this.apiKey) {
      throw new Error('GCP TTS API key is required for Google Cloud TTS');
    }

    try {
      const requestBody = {
        input: { text: text },
        voice: {
          languageCode: voiceConfig.languageCode || 'en-US',
          name: voiceConfig.name || 'en-US-Journey-F', // High quality neural voice
          ssmlGender: voiceConfig.ssmlGender || 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: voiceConfig.speakingRate || 1.0,
          pitch: voiceConfig.pitch || 0.0,
          volumeGainDb: voiceConfig.volumeGainDb || 0.0,
          sampleRateHertz: 16000, // Lower sample rate for faster processing
          effectsProfileId: ['headphone-class-device'] // Optimize for headphones
        }
      };

      const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('GCP TTS API Error:', errorData);
        
        if (response.status === 401) {
          this.clearApiKey();
          throw new Error('Invalid GCP TTS API key');
        } else if (response.status === 429) {
          throw new Error('GCP TTS rate limit exceeded');
        } else {
          throw new Error(`GCP TTS API error: ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (data.audioContent) {
        // Convert base64 audio to blob
        const audioBytes = atob(data.audioContent);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return audioUrl;
      } else {
        throw new Error('No audio content in GCP TTS response');
      }

    } catch (error) {
      console.error('Error calling GCP TTS API:', error);
      throw error;
    }
  }

  // Convert text to speech using Web Speech API (fallback)
  async synthesizeSpeechWebAPI(text, voiceConfig = {}) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      utterance.rate = voiceConfig.rate || 0.9;
      utterance.pitch = voiceConfig.pitch || 1.0;
      utterance.volume = voiceConfig.volume || 1.0;
      
      // Find a good voice
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;

      // Prefer high-quality voices
      const preferredVoices = [
        'Google US English',
        'Samantha',
        'Karen',
        'Moira',
        'Tessa',
        'Ava',
        'Allison'
      ];

      for (const preferredName of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(preferredName) && voice.lang.startsWith('en')
        );
        if (selectedVoice) break;
      }

      // If no preferred voice found, use any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.localService
        );
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Web Speech API error:', error);
        reject(error);
      };

      speechSynthesis.speak(utterance);
    });
  }

  // Main method to convert text to speech
  async synthesizeSpeech(text, voiceConfig = {}, returnAudioUrl = false) {
    await this.initialize();

    try {
      // Try Google Cloud TTS first if API key is available
      if (this.apiKey && !voiceConfig.forceWebAPI) {
        console.log('Using Google Cloud TTS');
        const audioUrl = await this.synthesizeSpeechGCP(text, voiceConfig);
        
        if (returnAudioUrl) {
          return audioUrl;
        } else {
          // Play the audio and return a promise that resolves when done
          return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl); // Clean up
              resolve();
            };
            audio.onerror = (error) => {
              URL.revokeObjectURL(audioUrl); // Clean up
              reject(error);
            };
            audio.play().catch(reject);
          });
        }
      } else {
        // Use Web Speech API as fallback
        console.log('Using Web Speech API fallback');
        if (returnAudioUrl) {
          throw new Error('Web Speech API cannot return audio URL');
        }
        return await this.synthesizeSpeechWebAPI(text, voiceConfig);
      }
    } catch (error) {
      console.error('TTS error:', error);
      
      // If GCP TTS fails and fallback is enabled, try Web Speech API
      if (this.fallbackEnabled && !voiceConfig.forceWebAPI && !returnAudioUrl) {
        console.log('Falling back to Web Speech API');
        try {
          return await this.synthesizeSpeechWebAPI(text, voiceConfig);
        } catch (fallbackError) {
          console.error('Fallback TTS also failed:', fallbackError);
          throw new Error('Both GCP TTS and Web Speech API failed');
        }
      }
      
      throw error;
    }
  }

  // Get available voices (for Web Speech API)
  getAvailableVoices() {
    if ('speechSynthesis' in window) {
      return speechSynthesis.getVoices();
    }
    return [];
  }

  // Test the TTS service
  async testTTS() {
    try {
      await this.synthesizeSpeech("Hello! Text to speech is working correctly.");
      return true;
    } catch (error) {
      console.error('TTS test failed:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const ttsService = new TTSService();
