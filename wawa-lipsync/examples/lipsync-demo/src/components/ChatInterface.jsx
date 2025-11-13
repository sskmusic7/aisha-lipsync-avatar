import { useState, useRef, useEffect } from "react";
import { lipsyncManager } from "../App";
import { geminiService } from "../services/geminiService";
import { ttsService } from "../services/ttsService";
import elevenLabsService from "../services/elevenLabsService";
import { ApiKeyManager } from "./ApiKeyManager";
import { VoiceSelector } from "./VoiceSelector";
import { aishaRules } from "../services/aishaPersonalityRules";
import { syllableAnalyzer } from "../services/syllableAnalyzer";
import {
  initializeBackend,
  getAuthUrl as getAuthUrlApi,
  searchDrive as searchDriveApi,
  listRecentDriveFiles as listRecentDriveFilesApi,
  searchEmails as searchEmailsApi,
  getUnreadEmails as getUnreadEmailsApi,
  getDirections as getDirectionsApi,
} from "../services/aishaBackendService";
import { useTTSStore } from "../stores/ttsStore";
import micIcon from "../assets/mic.png";

export const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "assistant",
      content: "What's good! I'm Ai'sha (pronounced 'aye-ey-shuh'), your AI assistant. You can speak to me or type a message, and I'll respond with both text and speech! How was your day, bestie?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showApiManager, setShowApiManager] = useState(false);
  const [showPreBufferConfig, setShowPreBufferConfig] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState('TfVjIROhkRShQb9pCFfK'); // Default: Keke voice
  const [apiStatus, setApiStatus] = useState({
    gemini: false,
    tts: false,
    elevenlabs: false,
    google: false
  });
  const [preBufferSettings, setPreBufferSettings] = useState({
    enabled: true,
    delayMs: 200,
    silentAnalysisDuration: 100
  });
  const [motionMode, setMotionMode] = useState('option4');
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);
  
  // TTS Store for automatic animation switching
  const startSpeaking = useTTSStore((state) => state.startSpeaking);
  const stopSpeaking = useTTSStore((state) => state.stopSpeaking);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedMode = window.localStorage?.getItem('aishaMotionMode');
    if (storedMode === 'option1' || storedMode === 'option2' || storedMode === 'option3' || storedMode === 'option4') {
      setMotionMode(storedMode);
    } else {
      window.localStorage?.setItem('aishaMotionMode', 'option4');
      setMotionMode('option4');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__preferredMotionMode = motionMode;
    try {
      window.localStorage?.setItem('aishaMotionMode', motionMode);
    } catch (err) {
      console.warn('Unable to persist motion mode preference:', err);
    }
    window.dispatchEvent(new CustomEvent('aisha-motion-mode-change', { detail: { mode: motionMode } }));
    if (typeof window.setMotionMode === 'function') {
      window.setMotionMode(motionMode);
    }
  }, [motionMode]);

  // Initialize speech recognition and pre-buffer settings
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Changed to non-continuous for push-to-talk
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognized:', transcript);
        setIsListening(false); // Turn off immediately after getting result
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      setIsInitialized(true);
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    // Configure TTS pre-buffering settings
    ttsService.configurePreBuffer(preBufferSettings);
  }, [preBufferSettings]);

  useEffect(() => {
    const initBackend = async () => {
      try {
        const result = await initializeBackend();
        console.log("[ChatInterface] Backend initialized:", result);
        setBackendReady(true);
        setBackendError(null);
        setApiStatus((prev) => ({ ...prev, google: true }));
      } catch (error) {
        console.warn("[ChatInterface] Backend initialization failed:", error);
        setBackendReady(false);
        setBackendError(error.message || "Backend unavailable");
        setApiStatus((prev) => ({ ...prev, google: false }));
      }
    };

    initBackend();
  }, []);

  // Initialize API services
  useEffect(() => {
    const initializeServices = async () => {
      console.log('🔧 Initializing API services...');
      
      // Initialize Gemini service
      const geminiInitialized = await geminiService.initialize();
      setApiStatus(prev => ({ ...prev, gemini: geminiInitialized }));
      
      // Initialize TTS service
      const ttsInitialized = await ttsService.initialize();
      setApiStatus(prev => ({ ...prev, tts: ttsInitialized }));
      
      // Initialize ElevenLabs service
      const elevenlabsInitialized = await elevenLabsService.initialize();
      setApiStatus(prev => ({ ...prev, elevenlabs: elevenlabsInitialized }));
      
      console.log('🔧 API Status:', { gemini: geminiInitialized, tts: ttsInitialized, elevenlabs: elevenlabsInitialized });
    };
    
    initializeServices();
  }, []);

  // Start/stop speech recognition (push-to-talk mode)
  const startSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    // Stop any current speech first
    if (isSpeaking) {
      stopSpeakingLocal();
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('🎤 Microphone activated - Push to talk');
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        console.log('🎤 Microphone deactivated');
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsListening(false);
      }
    }
  };

  // Stop current speech
  const stopSpeakingLocal = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    stopSpeaking(); // 🎬 Restore previous animation
  };

  // Clean text before TTS: PRESERVE NUMBERS, remove punctuation/emojis/etc.
  const sanitizeForSpeech = (rawText) => {
    if (!rawText) return "";
    let text = String(rawText);
    
    // FIRST: Protect numbers by replacing them with placeholders
    const numberPlaceholders = [];
    let placeholderIndex = 0;
    
    // Store all numbers (including decimals, times like 14:30, dates, etc.)
    text = text.replace(/\d+(?:\.\d+)?(?::\d+)?/g, (match) => {
      const placeholder = `__NUMBER_${placeholderIndex}__`;
      numberPlaceholders.push(match);
      placeholderIndex++;
      return placeholder;
    });
    
    // Replace URLs with a short placeholder
    text = text.replace(/https?:\/\/\S+/gi, "link");
    
    // Replace & with 'and'
    text = text.replace(/&/g, " and ");
    
    // Remove markdown characters (but keep numbers safe in placeholders)
    text = text.replace(/[*_~`>#|\\]/g, " ");
    
    // Remove brackets (but keep numbers safe)
    text = text.replace(/[\(\)\[\]\{\}]/g, " ");
    
    // Remove excessive dots (but keep numbers safe - placeholders don't have dots)
    text = text.replace(/\.{3,}/g, ".");
    
    // Remove excessive punctuation (but keep numbers safe)
    text = text.replace(/[!?.]{2,}/g, (m) => m[0]);
    
    // Remove emojis and non-speech unicode symbols
    text = text.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu, "");
    
    // Remove bullets and decorative characters
    text = text.replace(/[•·►▪︎➤➔➜–—]/g, " ");
    
    // Remove stray punctuation tokens (but preserve colons in time - already in placeholders)
    text = text.replace(/\s+[,;]\s+/g, ", ");
    
    // Remove other punctuation marks that shouldn't be read
    text = text.replace(/[,;:!?\-–—]/g, " ");
    
    // Collapse whitespace
    text = text.replace(/\s{2,}/g, " ").trim();
    
    // RESTORE NUMBERS from placeholders
    numberPlaceholders.forEach((number, index) => {
      text = text.replace(`__NUMBER_${index}__`, number);
    });
    
    return text;
  };

  // Send message to Gemini API
  const sendToGemini = async (message) => {
    try {
      // Get conversation history (excluding the initial welcome message)
      const conversationHistory = messages.slice(1);
      
      const response = await geminiService.sendMessage(message, conversationHistory);
      return response;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      if (error.message.includes('API key')) {
        return "I need a valid Gemini API key to respond. Please refresh the page to set up your API key.";
      } else if (error.message.includes('rate limit')) {
        return "I'm getting too many requests right now. Please wait a moment and try again.";
      } else {
        return "I'm sorry, I'm having trouble connecting right now. Please try again.";
      }
    }
  };

  // Fallback text-to-speech with simulated lip-sync
  const fallbackTextToSpeech = async (text) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Use consistent voice (prefer Google US English, then Samantha, then any Google voice)
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name === 'Google US English' && voice.lang.startsWith('en')
      ) || voices.find(voice => 
        voice.name === 'Samantha' && voice.lang.startsWith('en')
      ) || voices.find(voice => 
        voice.name.includes('Google') && voice.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🎤 Using consistent Web Speech API voice:', preferredVoice.name);
      }

      // Simulate lip-sync movement based on text content
      const simulateLipSync = () => {
        console.log('🎭 Starting syllable-based lip-sync analysis...');
        
        // Analyze text into syllable movements
        const movements = syllableAnalyzer.analyzeText(sanitizeForSpeech(text));
        console.log('📝 Generated', movements.length, 'syllable movements');
        
        let movementIndex = 0;
        let currentTimeout = null;
        
        const playNextMovement = () => {
          if (movementIndex >= movements.length) {
            // End of speech - reset to silence
            if (lipsyncManager) {
              lipsyncManager.viseme = 'sil';
              lipsyncManager.state = 'silence';
              lipsyncManager.features = {
                volume: 0.0,
                centroid: 0,
                bands: [0, 0, 0, 0, 0],
                deltaBands: [0, 0, 0, 0, 0]
              };
            }
            console.log('🎭 Syllable-based lip-sync complete');
            return;
          }
          
          const movement = movements[movementIndex];
          
          // Apply the viseme movement
          if (lipsyncManager) {
            lipsyncManager.viseme = movement.viseme;
            lipsyncManager.state = movement.viseme === 'sil' ? 'silence' : 'vowel';
            
            // Create realistic audio features based on movement
            lipsyncManager.features = {
              volume: movement.intensity * 0.4,
              centroid: getCentroidForViseme(movement.viseme),
              bands: getBandsForViseme(movement.viseme, movement.intensity),
              deltaBands: getDeltaBandsForViseme(movement.viseme, movement.intensity)
            };
          }
          
          console.log(`🎭 Syllable ${movementIndex + 1}/${movements.length}:`, 
            movement.sound || movement.syllable || 'unknown', 
            '->', movement.viseme, 
            `(${movement.duration}ms, ${(movement.intensity * 100).toFixed(0)}%)`);
          
          movementIndex++;
          
          // Schedule next movement
          currentTimeout = setTimeout(playNextMovement, movement.duration);
        };
        
        // Start the movement sequence
        playNextMovement();
        
        // Return cleanup function
        return () => {
          if (currentTimeout) {
            clearTimeout(currentTimeout);
          }
        };
      };
      
      // Start simulated lip-sync
      const cleanupLipSync = simulateLipSync();
      
      utterance.onstart = () => {
        console.log('🎤 Web Speech API started');
      };
      
      utterance.onend = () => {
        console.log('🎤 Web Speech API ended');
        if (cleanupLipSync) cleanupLipSync();
        setIsSpeaking(false);
        stopSpeaking(); // 🎬 Restore previous animation
        resolve();
      };
      
      utterance.onerror = (error) => {
        console.error('Web Speech API error:', error);
        if (cleanupLipSync) cleanupLipSync();
        setIsSpeaking(false);
        stopSpeaking(); // 🎬 Restore previous animation
        reject(error);
      };
      
      speechSynthesis.speak(utterance);
    });
  };

  // Convert text to speech with ElevenLabs (preferred) or fallback
  const textToSpeech = async (text) => {
    try {
      setIsSpeaking(true);
      startSpeaking(); // 🎬 Trigger animation switch to "armature.001"
      
      // Stop any current microphone input
      if (isListening) {
        recognitionRef.current?.stop();
      }
      
      console.log('🎤 Starting TTS with ElevenLabs (preferred) or fallback...');
      
      // Sanitize content so she doesn't read punctuation/emojis
      const speakText = sanitizeForSpeech(text);

      // Priority 1: ElevenLabs (high-quality voices) - ALWAYS try if API key is available
      // Check if API key exists (even if status says false, it might just be initialization issue)
      const hasElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || localStorage.getItem('elevenlabs-api-key');
      
      if (apiStatus.elevenlabs || hasElevenLabsKey) {
        try {
          console.log('🎵 Using ElevenLabs TTS with Keke voice:', selectedVoiceId);
          
          const audioBlob = await elevenLabsService.textToSpeechCached(speakText, {
            voiceId: selectedVoiceId
          });
          
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          // Connect audio to lipsync manager for mouth movement
          if (lipsyncManager) {
            console.log('🔗 Connecting ElevenLabs audio to lipsync manager...');
            try {
              lipsyncManager.connectAudio(audio);
              console.log('✅ ElevenLabs audio successfully connected to lipsync manager');
            } catch (error) {
              console.error('❌ Failed to connect ElevenLabs audio to lipsync manager:', error);
            }
          }
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            stopSpeaking(); // 🎬 Restore previous animation
          };
          
          audio.onerror = (error) => {
            console.error('ElevenLabs audio playback error:', error);
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            stopSpeaking(); // 🎬 Restore previous animation
          };
          
          await audio.play();
          console.log('✅ ElevenLabs TTS (Keke voice) completed successfully');
          return;
          
        } catch (elevenlabsError) {
          // Only log warning, but don't immediately fallback - ElevenLabs has retry logic now
          console.warn('⚠️ ElevenLabs TTS failed after retries:', elevenlabsError.message || elevenlabsError);
          // Still fallback, but log that we're losing Keke's voice
          console.warn('⚠️ Falling back to alternative TTS (not Keke voice)');
        }
      }
      
      // Priority 2: Google Cloud TTS (with lip-sync)
      if (apiStatus.tts) {
        try {
          console.log('🎵 Using Google Cloud TTS with pre-buffered lip-sync...');
          await ttsService.synthesizeSpeech(speakText, {}, false, lipsyncManager);
          console.log('✅ Google Cloud TTS completed successfully');
          return;
        } catch (gcpError) {
          console.warn('Google Cloud TTS failed, falling back to Web Speech API:', gcpError);
        }
      }
      
      // Priority 3: Web Speech API (fallback with simulated lip-sync)
      console.log('🎵 Using Web Speech API fallback with simulated lip-sync...');
      await fallbackTextToSpeech(speakText);
      
    } catch (error) {
      console.error('All TTS methods failed:', error);
      setIsSpeaking(false);
      stopSpeaking(); // 🎬 Restore previous animation
    }
  };
  // Helper functions for realistic audio feature generation
  const getCentroidForViseme = (viseme) => {
    const centroids = {
      'sil': 0,
      'aa': 800,   // Low frequency for "ah"
      'E': 1200,   // Mid frequency for "eh"
      'I': 1600,   // Higher frequency for "ih"
      'O': 900,    // Low-mid frequency for "oh"
      'U': 700,    // Low frequency for "oo"
      'PP': 0,     // Silent for closed mouth
      'FF': 2000,  // High frequency for fricatives
      'SS': 3000,  // Very high frequency for "s"
      'TH': 2500,  // High frequency for "th"
      'DD': 1000,  // Mid frequency for "d/t"
      'kk': 800,   // Low frequency for "k/g"
      'CH': 1500,  // Mid-high frequency for "ch"
      'nn': 1200,  // Mid frequency for "n"
      'RR': 1000   // Mid frequency for "r"
    };
    return centroids[viseme] || 1000;
  };

  const getBandsForViseme = (viseme, intensity) => {
    const baseBands = {
      'sil': [0, 0, 0, 0, 0],
      'aa': [0.8, 0.6, 0.4, 0.2, 0.1],
      'E': [0.6, 0.8, 0.6, 0.4, 0.2],
      'I': [0.4, 0.6, 0.8, 0.6, 0.4],
      'O': [0.7, 0.5, 0.3, 0.2, 0.1],
      'U': [0.9, 0.7, 0.5, 0.3, 0.2],
      'PP': [0, 0, 0, 0, 0],
      'FF': [0.2, 0.4, 0.6, 0.8, 0.6],
      'SS': [0.1, 0.2, 0.4, 0.6, 0.8],
      'TH': [0.1, 0.3, 0.5, 0.7, 0.6],
      'DD': [0.5, 0.7, 0.5, 0.3, 0.2],
      'kk': [0.6, 0.4, 0.2, 0.1, 0.1],
      'CH': [0.3, 0.5, 0.7, 0.5, 0.3],
      'nn': [0.4, 0.6, 0.4, 0.2, 0.1],
      'RR': [0.5, 0.6, 0.4, 0.2, 0.1]
    };
    return (baseBands[viseme] || [0.5, 0.5, 0.5, 0.5, 0.5]).map(band => band * intensity);
  };

  const getDeltaBandsForViseme = (viseme, intensity) => {
    const baseDelta = [0.05, 0.1, 0.15, 0.1, 0.05];
    return baseDelta.map(delta => delta * intensity);
  };

  const stripHtml = (text = "") => text.replace(/<[^>]+>/g, "");

  const detectBackendCommand = (rawText) => {
    if (!rawText) return null;
    const normalized = rawText
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();

    const sanitized = normalized.replace(/[.!?,]+$/, "").trim();
    const lower = sanitized.toLowerCase();

    // === BACKEND CONNECTION ===
    // Get OAuth URL
    if (lower.match(/\b(connect|setup|set up|link|authenticate|login|sign in|get\s+auth)\s+(?:to\s+)?(?:google|backend|services|my\s+account)/i)) {
      return { type: "connect_backend" };
    }
    
    // Initialize after OAuth
    if (lower.match(/\b(initialize|init|finish|complete|finalize)\s+(?:backend|google|services|setup)/i)) {
      return { type: "initialize_backend" };
    }

    // === LOCATION SETTING ===
    const locationMatch = lower.match(/\b(i am|i'm|im)\s+(?:currently\s+)?in\s+(.+)/i);
    if (locationMatch) {
      return {
        type: "set_location",
        location: locationMatch[2].replace(/[.!?,]+$/, "").trim()
      };
    }

    // === GMAIL QUERIES ===
    // "last X emails" or "last three emails" pattern
    const lastEmailsMatch = lower.match(/\b(?:what are|show|get|list|see|check)\s+(?:my\s+)?(?:last|recent)\s+(\d+)\s+(?:email|emails|gmail|messages|mail)/i);
    if (lastEmailsMatch) {
      return { 
        type: "gmail_unread", 
        count: parseInt(lastEmailsMatch[1]) || 10 
      };
    }

    // Latest email / most recent email
    if (lower.match(/\b(what'?s|what is|show me|get|fetch|check|see|read)\s+(?:my\s+)?(?:latest|most recent|newest|last|recent)\s+(?:email|gmail|message|mail)/i)) {
      return { type: "gmail_latest" };
    }

    // Unread emails
    if (lower.match(/\b(show|get|fetch|check|see|list|read|what are)\s+(?:my\s+)?(?:unread|new)\s+(?:email|emails|gmail|messages|mail)/i)) {
      return { type: "gmail_unread" };
    }

    // General Gmail access
    if (lower.match(/\b(can you|can u|show me|list|see|access|check|read|open)\s+(?:my\s+)?(?:gmail|email|emails|inbox|mail)/i)) {
      return { type: "gmail_unread" }; // Default to unread emails
    }

    // "what was my last email to X" or "email to X from Y"
    const emailToMatch = lower.match(/\b(?:what was|show|find|get)\s+(?:my\s+)?(?:last|recent)\s+(?:email|message)\s+(?:to|from)\s+["']?(.+?)["']?(?:\s+from\s+["']?(.+?)["']?)?/i);
    if (emailToMatch) {
      const query = emailToMatch[1] + (emailToMatch[2] ? ` ${emailToMatch[2]}` : '');
      return {
        type: "gmail_search",
        query: query.trim()
      };
    }

    // "email about X" or "emails with X"
    const emailAboutMatch = lower.match(/\b(?:what|show|find|get|check)\s+(?:was|were|are)\s+(?:my\s+)?(?:last|recent|any)\s+(?:email|emails|message|messages)\s+(?:about|with|regarding|for)\s+["']?(.+?)["']?/i);
    if (emailAboutMatch) {
      return {
        type: "gmail_search",
        query: emailAboutMatch[1].trim()
      };
    }

    // Search inbox for specific query
    const inboxSearchMatch = lower.match(/\b(?:search|scan|find|look for|check for)\s+(?:my\s+)?(?:inbox|gmail|email|emails)\s+(?:for|about)\s+["']?(.+?)["']?$/i);
    if (inboxSearchMatch) {
      return {
        type: "gmail_search",
        query: inboxSearchMatch[1].trim()
      };
    }

    // Search with query in different positions
    const gmailQueryMatch = lower.match(/\b(?:search|find|look for)\s+["']?(.+?)["']?\s+(?:in|from)\s+(?:my\s+)?(?:gmail|email|inbox)/i);
    if (gmailQueryMatch) {
      return {
        type: "gmail_search",
        query: gmailQueryMatch[1].trim()
      };
    }

    // === DRIVE QUERIES ===
    // "last uploads" or "recent uploads"
    if (lower.match(/\b(?:what are|show|get|list|see|check)\s+(?:my\s+)?(?:last|recent|latest)\s+(?:google\s+)?drive\s+(?:upload|uploads|files)/i)) {
      return { type: "drive_list" };
    }

    // General Drive access
    if (lower.match(/\b(can you|can u|show me|list|see|access|check|open)\s+(?:my\s+)?(?:google\s+)?drive/i)) {
      return { type: "drive_list" };
    }

    // Search Drive for specific query
    const driveSearchMatch = lower.match(/\b(?:search|find|look for|show|list)\s+(?:my\s+)?(?:google\s+)?drive\s+(?:for|about|with)\s+["']?(.+?)["']?$/i);
    if (driveSearchMatch) {
      return {
        type: "drive_search",
        query: driveSearchMatch[1].trim()
      };
    }

    // Drive search with query in different position
    const driveQueryMatch = lower.match(/\b(?:search|find|look for)\s+["']?(.+?)["']?\s+(?:in|from)\s+(?:my\s+)?(?:google\s+)?drive/i);
    if (driveQueryMatch) {
      return {
        type: "drive_search",
        query: driveQueryMatch[1].trim()
      };
    }

    // === MAPS QUERIES ===
    const routeFromToMatch = sanitized.match(/(?:best\s+route|route|directions|how to get|navigate)\s+from\s+(.+?)\s+to\s+(.+)/i);
    if (routeFromToMatch) {
      return {
        type: "maps_directions",
        origin: routeFromToMatch[1].trim(),
        destination: routeFromToMatch[2].trim()
      };
    }

    const routeToMatch = sanitized.match(/(?:best\s+route|route|directions|how to get|navigate)\s+(?:to|for)\s+(.+)/i);
    if (routeToMatch) {
      return {
        type: "maps_directions_to",
        destination: routeToMatch[1].trim()
      };
    }

    return null;
  };

  const executeBackendCommand = async (command) => {
    if (!command) return null;

    if (command.type === "set_location") {
      setUserLocation(command.location);
      return `Locked in ${command.location} as your starting point.`;
    }

    // These commands work even when backend isn't ready
    if (command.type === "connect_backend") {
      try {
        const { url: authUrl } = await getAuthUrlApi();
        // Return URL that will be auto-linked by browser
        return `To connect your Google account:\n\nClick this link to sign in:\n${authUrl}\n\nAfter you sign in and see "Authentication successful!", come back here and say "initialize backend" to finish the setup.`;
      } catch (error) {
        console.error("Failed to get auth URL:", error);
        return `I couldn't get the authentication URL. Error: ${error.message}. Make sure the backend is running.`;
      }
    }

    if (command.type === "initialize_backend") {
      try {
        const result = await initializeBackend();
        setBackendReady(true);
        setBackendError(null);
        setApiStatus((prev) => ({ ...prev, google: true }));
        return `✅ Successfully connected! I can now access your Google services (Gmail, Drive, Calendar, etc.). Try asking me to check your emails or show your Drive files!`;
      } catch (error) {
        console.error("Backend initialization failed:", error);
        setBackendReady(false);
        setBackendError(error.message || "Initialization failed");
        setApiStatus((prev) => ({ ...prev, google: false }));
        
        if (error.message?.includes("ENOENT") || error.message?.includes("No OAuth tokens")) {
          return `I couldn't initialize because OAuth tokens weren't found. Please:\n\n1. Say "connect google" to get the OAuth link\n2. Sign in with Google\n3. Then say "initialize backend" again`;
        }
        return `Initialization failed: ${error.message}. Make sure you've completed the OAuth flow first by saying "connect google".`;
      }
    }

    // All other commands require backend to be ready
    if (!backendReady) {
      if (backendError) {
        // Check if it's an OAuth/initialization error
        if (backendError.includes("not initialized") || backendError.includes("OAuth") || backendError.includes("503") || backendError.includes("ENOENT")) {
          return `I can't access your Google services right now. Say "connect google" to get started, or complete the OAuth flow at the backend URL and initialize it.`;
        }
        return `I can't reach my Google services: ${backendError}. Say "connect google" to reconnect.`;
      }
      return "I can't access your Google services right now. Say \"connect google\" to get the OAuth link and start the setup.";
    }

    switch (command.type) {
      case "drive_list": {
        const { files = [] } = await listRecentDriveFilesApi(10);
        if (!files.length) {
          return "Your Drive is empty or I couldn't access it right now.";
        }
        const summary = files.slice(0, 10).map((file) => {
          const updated =
            file.modifiedTime || file.createdTime
              ? ` · updated ${new Date(file.modifiedTime || file.createdTime).toLocaleDateString()}`
              : "";
          return `• ${file.name}${updated}`;
        });
        return `Here are your recent Drive files:\n${summary.join("\n")}`;
      }

      case "drive_search": {
        const { files = [] } = await searchDriveApi(command.query);
        if (!files.length) {
          return `I didn't find anything in Drive for "${command.query}".`;
        }
        const summary = files.slice(0, 5).map((file) => {
          const updated =
            file.modifiedTime || file.createdTime
              ? ` · updated ${new Date(file.modifiedTime || file.createdTime).toLocaleDateString()}`
              : "";
          return `• ${file.name}${updated}`;
        });
        return `Here's what I found in Drive for "${command.query}":\n${summary.join("\n")}`;
      }

      case "gmail_latest": {
        // Get the most recent email by searching for all emails and taking the first one
        const emailResponse = await searchEmailsApi("in:inbox");
        const emails = emailResponse.results ?? emailResponse.emails ?? [];
        if (!emails.length) {
          return "Your inbox is empty or I couldn't access it right now.";
        }
        const latest = emails[0];
        const date = latest.date ? ` · ${latest.date}` : "";
        return `Your latest email:\n${latest.subject} — from ${latest.from}${date}`;
      }

      case "gmail_unread": {
        const count = command.count || 10;
        const { emails = [] } = await getUnreadEmailsApi(count);
        if (!emails.length) {
          return "You have no unread emails! 🎉";
        }
        const emailList = emails.slice(0, count).map((email, index) => {
          const date = email.date ? ` · ${email.date}` : "";
          return `${index + 1}. ${email.subject} — ${email.from}${date}`;
        });
        return `Here are your ${emails.length > count ? `last ${count}` : emails.length} email${emails.length > 1 ? 's' : ''}:\n${emailList.join("\n")}`;
      }

      case "gmail_search": {
        const emailResponse = await searchEmailsApi(command.query);
        const emails = emailResponse.results ?? emailResponse.emails ?? [];
        const count = emailResponse.count ?? emails.length;
        if (!emails.length) {
          return `No emails matched "${command.query}".`;
        }
        const topEmails = emails.slice(0, 5).map((email, index) => {
          const date = email.date ? ` · ${email.date}` : "";
          return `${index + 1}. ${email.subject} — ${email.from}${date}`;
        });
        return `I found ${count} email${count > 1 ? 's' : ''} matching "${command.query}". Top results:\n${topEmails.join("\n")}`;
      }

      case "maps_directions":
      case "maps_directions_to": {
        const origin =
          command.type === "maps_directions"
            ? command.origin
            : userLocation;

        const destination = command.destination;

        if (!origin) {
          return "Tell me where you're starting from first, like “I'm in Balham.”";
        }

        const response = await getDirectionsApi({
          origin,
          destination
        });

        if (!response.route) {
          return `I couldn't find a route from ${origin} to ${destination}.`;
        }

        const leg = response.route.legs?.[0];
        const duration = leg?.duration?.text;
        const distance = leg?.distance?.text;
        const steps = (leg?.steps ?? []).slice(0, 3);
        const stepSummary = steps
          .map((step, index) => {
            const instruction = stripHtml(step.html_instructions || "");
            const stepDistance = step.distance?.text ? ` (${step.distance.text})` : "";
            return `${index + 1}. ${instruction}${stepDistance}`;
          })
          .join("\n");

        const arrivalSummary = [
          duration ? `about ${duration}` : null,
          distance ? distance : null
        ]
          .filter(Boolean)
          .join(", ");

        if (command.type === "maps_directions") {
          setUserLocation(origin);
        }

        let message = `Fastest route from ${leg?.start_address || origin} to ${leg?.end_address || destination}`;
        if (arrivalSummary) {
          message += ` is ${arrivalSummary}.`;
        } else {
          message += ".";
        }
        if (stepSummary) {
          message += `\nFirst few steps:\n${stepSummary}`;
        }
        return message;
      }

      default:
        return null;
    }
  };

  // Handle sending a message
  const handleSendMessage = async (text = inputText) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const backendCommand = detectBackendCommand(text.trim());

      if (backendCommand) {
        try {
          const backendResponse = await executeBackendCommand(backendCommand);
          if (backendResponse) {
            const assistantMessage = {
              id: Date.now() + 1,
              type: "assistant",
              content: backendResponse,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            await textToSpeech(backendResponse);
            return;
          }
        } catch (backendError) {
          console.error("Backend command failed:", backendError);
          if (backendError.status === 503 || backendError.message?.includes("not initialized") || backendError.message?.includes("ENOENT")) {
            setApiStatus(prev => ({ ...prev, google: false }));
            setBackendReady(false);
            setBackendError(backendError.message || "Service unavailable");
          }
          // Be honest about the error - don't make up responses
          const errorMessage = backendError.message || "I couldn't complete that Google command. The backend service may need to be re-initialized.";
          const assistantMessage = {
            id: Date.now() + 1,
            type: "assistant",
            content: errorMessage,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          await textToSpeech(errorMessage);
          return; // Don't fall through to Gemini
        }
      }

      // Get AI response
      const aiResponse = await sendToGemini(text.trim());
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: "assistant", 
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Stop loading state before speaking so user can continue interacting
      setIsLoading(false);
      
      // Convert to speech and play
      await textToSpeech(aiResponse);

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-full max-h-96 bg-white rounded-lg shadow-lg border">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex flex-col">
          <h3 className="font-semibold">🤖 Ai'sha Chat Assistant</h3>
          <div className="flex items-center gap-2 text-xs opacity-90">
            <span className={apiStatus.gemini ? "text-green-300" : "text-yellow-300"}>
              {apiStatus.gemini ? "✅ Gemini" : "⚠️ Gemini"}
            </span>
            <span className={apiStatus.elevenlabs ? "text-green-300" : "text-yellow-300"}>
              {apiStatus.elevenlabs ? "✅ ElevenLabs" : "⚠️ ElevenLabs"}
            </span>
            <span className={apiStatus.tts ? "text-green-300" : "text-yellow-300"}>
              {apiStatus.tts ? "✅ GCP TTS" : "⚠️ GCP TTS"}
            </span>
            <span
              className={apiStatus.google ? "text-green-300" : "text-yellow-300"}
              title={backendError || undefined}
            >
              {apiStatus.google ? "✅ Google APIs" : "⚠️ Google APIs"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded px-2 py-1 text-xs">
            <span className="uppercase tracking-wide text-white/80">Motion</span>
            <select
              value={motionMode}
              onChange={(e) => setMotionMode(e.target.value)}
              className="bg-white bg-opacity-20 border border-white/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <option value="option1">Cascade</option>
              <option value="option2">Body Focus</option>
              <option value="option3">Normalized</option>
              <option value="option4">Counter Rotation</option>
            </select>
          </div>
          {isSpeaking && (
            <div className="flex items-center gap-1">
              <span className="animate-pulse text-sm">🗣️ Speaking</span>
              <button
                onClick={stopSpeakingLocal}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
              >
                Stop
              </button>
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-1">
              <span className="animate-pulse text-sm">🎤 Listening...</span>
              <button
                onClick={stopSpeechRecognition}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
              >
                Stop
              </button>
            </div>
          )}
          <button
            onClick={() => setShowPreBufferConfig(true)}
            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm"
            title="Configure Pre-buffering"
          >
            ⚡ Speed
          </button>
          <button
            onClick={() => setShowVoiceSelector(!showVoiceSelector)}
            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm"
            title="Select Voice"
          >
            🎤 Voice
          </button>
          <button
            onClick={() => setShowApiManager(true)}
            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm"
            title="Configure API Keys"
          >
            ⚙️ Setup
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === "user"
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full" style={{animationDelay: '0.1s'}}></div>
                <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message or use voice..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isListening}
          />
          <button
            type="button"
            onMouseDown={startSpeechRecognition}
            onMouseUp={stopSpeechRecognition}
            onTouchStart={startSpeechRecognition}
            onTouchEnd={stopSpeechRecognition}
            disabled={isLoading || !isInitialized}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } ${(!isInitialized || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Hold down to speak (Push to Talk)"
          >
            <img
              src={micIcon}
              alt="Push to talk"
              className="w-5 h-5 object-contain"
            />
          </button>
          <button
            type="submit"
            disabled={isLoading || !inputText.trim() || isListening}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </form>
        
        {!isInitialized && (
          <p className="text-xs text-gray-500 mt-2">
            Speech recognition not available in this browser
          </p>
        )}
      </div>
      
      {/* API Key Manager Modal */}
      {showApiManager && (
        <ApiKeyManager onClose={() => setShowApiManager(false)} />
      )}
      
      {/* Voice Selector */}
      {showVoiceSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🎤 Select Ai'sha's Voice</h2>
              <button
                onClick={() => setShowVoiceSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <VoiceSelector 
              onVoiceChange={setSelectedVoiceId}
              selectedVoiceId={selectedVoiceId}
            />
          </div>
        </div>
      )}
      
      {/* Pre-buffer Configuration Modal */}
      {showPreBufferConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">⚡ Lip-sync Speed Configuration</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Pre-buffering</label>
                <input
                  type="checkbox"
                  checked={preBufferSettings.enabled}
                  onChange={(e) => setPreBufferSettings(prev => ({
                    ...prev,
                    enabled: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">
                  Audio Delay: {preBufferSettings.delayMs}ms
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={preBufferSettings.delayMs}
                  onChange={(e) => setPreBufferSettings(prev => ({
                    ...prev,
                    delayMs: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Lower = faster response, Higher = better sync
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">
                  Silent Analysis: {preBufferSettings.silentAnalysisDuration}ms
                </label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  value={preBufferSettings.silentAnalysisDuration}
                  onChange={(e) => setPreBufferSettings(prev => ({
                    ...prev,
                    silentAnalysisDuration: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  How long to analyze audio silently before playback
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowPreBufferConfig(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  ttsService.configurePreBuffer(preBufferSettings);
                  setShowPreBufferConfig(false);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
