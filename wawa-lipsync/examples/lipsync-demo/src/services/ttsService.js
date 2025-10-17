// Google Cloud Text-to-Speech Service
// This service handles text-to-speech conversion using Google Cloud TTS API

class TTSService {
  constructor() {
    this.apiKey = null;
    this.baseURL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
    this.fallbackEnabled = true; // Use Web Speech API as fallback
    
    // Pre-buffering configuration for ultra-fast lip-sync
    this.preBufferConfig = {
      enabled: true, // Enable pre-buffering
      delayMs: 200, // Delay before audio playback (200ms for lip-sync pre-processing)
      silentAnalysisDuration: 100, // How long to analyze audio silently before playback
      minDelayMs: 50, // Minimum delay to ensure lip-sync is ready
      maxDelayMs: 500 // Maximum delay to prevent too much lag
    };
    
    // Audio pre-processing state
    this.preBufferState = {
      isPreBuffering: false,
      preBufferAudio: null,
      preBufferStartTime: 0,
      scheduledPlayTime: 0
    };
  }

  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Initialize with API key
  async initialize() {
    // Priority 1: Environment variable (set in Netlify)
    this.apiKey = import.meta.env.VITE_GCP_TTS_API_KEY;
    
    if (this.apiKey) {
      console.log('✅ Using Google Cloud TTS API key from environment variables');
      return true;
    }
    
    // Priority 2: localStorage (for local development)
    this.apiKey = localStorage.getItem('gcp-tts-api-key');
    
    if (this.apiKey) {
      console.log('✅ Using Google Cloud TTS API key from localStorage');
      return true;
    }
    
    // No API key available - will use Web Speech API fallback
    console.warn('⚠️ No Google Cloud TTS API key found. Using Web Speech API fallback (no lip-sync). Set VITE_GCP_TTS_API_KEY in Netlify environment variables for full functionality.');
    return false; // No GCP TTS, but fallback is available
  }

  // Clear stored API key
  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('gcp-tts-api-key');
  }

  // Configure pre-buffering settings
  configurePreBuffer(config = {}) {
    this.preBufferConfig = { ...this.preBufferConfig, ...config };
    console.log('Pre-buffer config updated:', this.preBufferConfig);
  }

  // Pre-process audio for silent lip-sync analysis
  async preProcessAudioForLipsync(audioUrl, lipsyncManager) {
    if (!this.preBufferConfig.enabled || !lipsyncManager) {
      return null;
    }

    try {
      console.log('🎬 Starting audio pre-processing for lip-sync...');
      
      // Create a silent audio element for pre-analysis
      const preBufferAudio = new Audio();
      preBufferAudio.src = audioUrl;
      preBufferAudio.preload = 'auto';
      preBufferAudio.crossOrigin = 'anonymous';
      preBufferAudio.volume = 0; // Silent for pre-processing
      
      // Store pre-buffer state
      this.preBufferState = {
        isPreBuffering: true,
        preBufferAudio: preBufferAudio,
        preBufferStartTime: Date.now(),
        scheduledPlayTime: Date.now() + this.preBufferConfig.delayMs
      };

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        preBufferAudio.oncanplaythrough = resolve;
        preBufferAudio.onerror = reject;
        
        // Timeout after 3 seconds
        setTimeout(() => {
          if (preBufferAudio.readyState < 3) {
            reject(new Error('Audio pre-load timeout'));
          }
        }, 3000);
      });

      // Connect to lip-sync manager for silent analysis
      console.log('🔗 Connecting pre-buffer audio to lip-sync manager...');
      lipsyncManager.connectAudio(preBufferAudio);
      
      // Start silent analysis
      console.log('🔍 Starting silent lip-sync analysis...');
      preBufferAudio.currentTime = 0;
      
      // Play silently for analysis duration
      const playPromise = preBufferAudio.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.warn('Silent pre-play failed (this is often expected):', err);
        });
      }

      // Stop silent analysis after configured duration
      setTimeout(() => {
        if (preBufferAudio && !preBufferAudio.paused) {
          preBufferAudio.pause();
          preBufferAudio.currentTime = 0; // Reset for actual playback
          console.log('✅ Silent analysis complete, ready for synchronized playback');
        }
      }, this.preBufferConfig.silentAnalysisDuration);

      return preBufferAudio;
      
    } catch (error) {
      console.error('Error in audio pre-processing:', error);
      this.preBufferState.isPreBuffering = false;
      return null;
    }
  }

  // Create synchronized audio playback with pre-buffered lip-sync
  createSynchronizedAudio(audioUrl, lipsyncManager, onEnd, onError) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.volume = 1.0; // Full volume for actual playback
      
      // Calculate when to start playback for perfect sync
      const now = Date.now();
      const timeSincePreBuffer = now - this.preBufferState.preBufferStartTime;
      const remainingDelay = Math.max(0, this.preBufferConfig.delayMs - timeSincePreBuffer);
      
      console.log(`⏱️ Scheduling audio playback in ${remainingDelay}ms for perfect sync`);
      console.log('🔍 Pre-buffer start time:', this.preBufferState.preBufferStartTime);
      console.log('🔍 Current time:', now);
      console.log('🔍 Time since pre-buffer:', timeSincePreBuffer);
      
      // Schedule playback for perfect synchronization
      const playAudio = () => {
        console.log('🎵 Starting synchronized audio playback');
        
        // CRITICAL: Connect the actual playback audio to lipsync manager
        if (lipsyncManager) {
          console.log('🔗 Connecting playback audio to lipsync manager...');
          try {
            lipsyncManager.connectAudio(audio);
            console.log('✅ Audio successfully connected to lipsync manager');
          } catch (error) {
            console.error('❌ Failed to connect audio to lipsync manager:', error);
          }
        } else {
          console.error('❌ No lipsyncManager provided for audio connection');
        }
        
        audio.play().then(() => {
          resolve(audio);
        }).catch(reject);
      };

      if (remainingDelay <= 0) {
        // Pre-buffer time has passed, play immediately
        console.log('🚀 Pre-buffer complete, playing immediately');
        playAudio();
      } else {
        // Wait for the remaining delay
        console.log(`⏰ Waiting ${remainingDelay}ms before playback...`);
        setTimeout(() => {
          console.log('⏰ Delay complete, starting playback...');
          playAudio();
        }, remainingDelay);
      }

      // Set up event handlers
      audio.onended = () => {
        this.preBufferState.isPreBuffering = false;
        onEnd && onEnd();
      };
      
      audio.onerror = (error) => {
        this.preBufferState.isPreBuffering = false;
        onError && onError(error);
        reject(error);
      };
    });
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

  // Main method to convert text to speech with pre-buffering
  async synthesizeSpeech(text, voiceConfig = {}, returnAudioUrl = false, lipsyncManager = null) {
    await this.initialize();

    try {
      // Try Google Cloud TTS first if API key is available
      if (this.apiKey && !voiceConfig.forceWebAPI) {
        console.log('✅ Using Google Cloud TTS with pre-buffering');
        console.log('🔍 API Key available, lipsyncManager provided:', !!lipsyncManager);
        const audioUrl = await this.synthesizeSpeechGCP(text, voiceConfig);
        
        if (returnAudioUrl) {
          return audioUrl;
        } else {
          // Use pre-buffering for ultra-fast lip-sync
          if (this.preBufferConfig.enabled && lipsyncManager) {
            console.log('🚀 Using pre-buffered lip-sync for maximum responsiveness');
            
            // Start pre-processing immediately
            await this.preProcessAudioForLipsync(audioUrl, lipsyncManager);
            
            // Return a promise that resolves when synchronized playback is complete
            return new Promise((resolve, reject) => {
              this.createSynchronizedAudio(audioUrl, lipsyncManager, 
                () => {
                  URL.revokeObjectURL(audioUrl); // Clean up
                  resolve();
                },
                (error) => {
                  URL.revokeObjectURL(audioUrl); // Clean up
                  reject(error);
                }
              ).catch(reject);
            });
          } else {
            // Fallback to standard playback
            console.log('Using standard audio playback (no pre-buffering)');
            return new Promise((resolve, reject) => {
              const audio = new Audio(audioUrl);
              
              // CRITICAL: Connect audio to lipsync manager for mouth movement
              if (lipsyncManager) {
                console.log('🔗 Connecting standard audio to lipsync manager...');
                try {
                  lipsyncManager.connectAudio(audio);
                  console.log('✅ Standard audio successfully connected to lipsync manager');
                } catch (error) {
                  console.error('❌ Failed to connect standard audio to lipsync manager:', error);
                }
              } else {
                console.error('❌ No lipsyncManager provided for standard audio connection');
              }
              
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
