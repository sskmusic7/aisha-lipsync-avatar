import { useState, useRef, useEffect } from "react";
import { lipsyncManager } from "../App";
import { geminiService } from "../services/geminiService";
import { ttsService } from "../services/ttsService";
import { ApiKeyManager } from "./ApiKeyManager";

export const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "assistant",
      content: "Hello! I'm your AI assistant. You can speak to me or type a message, and I'll respond with both text and speech!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showApiManager, setShowApiManager] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognized:', transcript);
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
  }, []);

  // Start/stop speech recognition
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Stop any current speech first
      if (isSpeaking) {
        stopSpeaking();
      }
      
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Stop current speech
  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
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

  // Convert text to speech and wire to lip-sync
  const textToSpeech = async (text) => {
    try {
      setIsSpeaking(true);
      
      // First, try to get audio URL from TTS service (if using GCP TTS)
      try {
        const audioUrl = await ttsService.synthesizeSpeech(text, {}, true);
        
        // Create audio element exactly like the working audio files
        const audio = new Audio();
        audio.src = audioUrl;
        audio.preload = 'auto'; // Preload for faster start
        audio.crossOrigin = 'anonymous'; // Allow cross-origin for better performance
        currentAudioRef.current = audio;
        
        // Stop any current microphone input
        if (isListening) {
          recognitionRef.current?.stop();
        }
        
        // Connect audio to lipsync EXACTLY like the working audio files
        console.log('Connecting TTS audio to lipsync manager...');
        lipsyncManager.connectAudio(audio);
        console.log('TTS audio connected to lipsync manager');
        
        // Debug: Check if audio is actually playing
        audio.onplay = () => console.log('TTS Audio started playing');
        audio.ontimeupdate = () => {
          if (audio.currentTime > 0) {
            console.log('TTS Audio playing at time:', audio.currentTime.toFixed(2));
          }
        };
        
        return new Promise((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl); // Clean up
            setIsSpeaking(false);
            currentAudioRef.current = null;
            resolve();
          };
          
          audio.onerror = (error) => {
            console.error('TTS Audio error:', error);
            URL.revokeObjectURL(audioUrl); // Clean up
            setIsSpeaking(false);
            currentAudioRef.current = null;
            reject(error);
          };
          
          // Play the audio
          audio.play().catch(reject);
        });
        
      } catch (gcpError) {
        // Fallback to Web Speech API (won't drive lip-sync)
        console.log('Using Web Speech API fallback (no lip-sync)');
        
        return new Promise((resolve, reject) => {
          if (!('speechSynthesis' in window)) {
            reject(new Error('Speech synthesis not supported'));
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          // Find a good voice
          const voices = speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Samantha') ||
            voice.name.includes('Karen')
          );
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          utterance.onend = () => {
            setIsSpeaking(false);
            resolve();
          };

          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            setIsSpeaking(false);
            reject(error);
          };

          speechSynthesis.speak(utterance);
        });
      }
      
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsSpeaking(false);
      throw error;
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
      // Get AI response
      const aiResponse = await sendToGemini(text.trim());
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: "assistant", 
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

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
    } finally {
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
        <h3 className="font-semibold">🤖 AI Chat Assistant</h3>
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <div className="flex items-center gap-1">
              <span className="animate-pulse text-sm">🗣️ Speaking</span>
              <button
                onClick={stopSpeaking}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
              >
                Stop
              </button>
            </div>
          )}
          {isListening && (
            <span className="animate-pulse text-sm">🎤 Listening...</span>
          )}
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
              <p className="text-sm">{message.content}</p>
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
            onClick={toggleSpeechRecognition}
            disabled={isLoading || !isInitialized}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } ${(!isInitialized || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? '🛑' : '🎤'}
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
    </div>
  );
};
