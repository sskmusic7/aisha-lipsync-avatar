import { useState, useRef, useEffect } from "react";
import { lipsyncManager } from "../App";
import { geminiService } from "../services/geminiService";
import { ttsService } from "../services/ttsService";
import { ApiKeyManager } from "./ApiKeyManager";
import { aishaRules } from "../services/aishaPersonalityRules";

export const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "assistant",
      content: "What's good! I'm A.Isha, your AI assistant. You can speak to me or type a message, and I'll respond with both text and speech! How was your day, bestie?",
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
  const [preBufferSettings, setPreBufferSettings] = useState({
    enabled: true,
    delayMs: 200,
    silentAnalysisDuration: 100
  });
  
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

  // Initialize speech recognition and pre-buffer settings
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

    // Configure TTS pre-buffering settings
    ttsService.configurePreBuffer(preBufferSettings);
  }, [preBufferSettings]);

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

  // Convert text to speech with ultra-fast pre-buffered lip-sync
  const textToSpeech = async (text) => {
    try {
      setIsSpeaking(true);
      
      // Stop any current microphone input
      if (isListening) {
        recognitionRef.current?.stop();
      }
      
      console.log('🎤 Starting ultra-fast TTS with pre-buffered lip-sync...');
      console.log('🔍 LipsyncManager available:', !!lipsyncManager);
      console.log('🔍 LipsyncManager features:', lipsyncManager?.features);
      
      // Use the new pre-buffering system for maximum responsiveness
      try {
        // This will automatically handle pre-buffering and synchronization
        await ttsService.synthesizeSpeech(text, {}, false, lipsyncManager);
        
        console.log('✅ Pre-buffered TTS completed successfully');
        
      } catch (gcpError) {
        console.log('GCP TTS failed, falling back to Web Speech API (no lip-sync)');
        console.log('⚠️ A.Isha will speak but her mouth won\'t move without Google Cloud TTS API key');
        
        // Fallback to Web Speech API with simulated lip-sync
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

          // Simulate lip-sync movement based on text content
          const simulateLipSync = () => {
            const words = text.toLowerCase().split(' ');
            let wordIndex = 0;
            
            const lipSyncInterval = setInterval(() => {
              if (wordIndex >= words.length) {
                clearInterval(lipSyncInterval);
                // Reset to silence at the end
                if (lipsyncManager) {
                  lipsyncManager.viseme = 'sil';
                  lipsyncManager.state = 'silence';
                }
                return;
              }
              
              const word = words[wordIndex];
              
              // Simple viseme mapping based on word content
              let viseme = 'sil';
              if (word.includes('a') || word.includes('ah')) viseme = 'aa';
              else if (word.includes('e') || word.includes('eh')) viseme = 'E';
              else if (word.includes('i') || word.includes('ih')) viseme = 'I';
              else if (word.includes('o') || word.includes('oh')) viseme = 'O';
              else if (word.includes('u') || word.includes('uh')) viseme = 'U';
              else if (word.includes('m') || word.includes('p') || word.includes('b')) viseme = 'PP';
              else if (word.includes('f') || word.includes('v')) viseme = 'FF';
              else if (word.includes('s') || word.includes('z')) viseme = 'SS';
              else if (word.includes('th')) viseme = 'TH';
              else if (word.includes('d') || word.includes('t')) viseme = 'DD';
              else if (word.includes('k') || word.includes('g')) viseme = 'kk';
              else if (word.includes('ch') || word.includes('j')) viseme = 'CH';
              else if (word.includes('n')) viseme = 'nn';
              else if (word.includes('r')) viseme = 'RR';
              
              // Manually set the viseme in the lipsync manager
              if (lipsyncManager) {
                lipsyncManager.viseme = viseme;
                lipsyncManager.state = viseme === 'sil' ? 'silence' : 'vowel';
                // Simulate some audio features for visual feedback
                lipsyncManager.features = {
                  volume: 0.3,
                  centroid: 1000,
                  bands: [0.1, 0.2, 0.3, 0.2, 0.1],
                  deltaBands: [0.05, 0.1, 0.15, 0.1, 0.05]
                };
              }
              
              console.log('🎭 Simulated lip-sync for word:', word, 'viseme:', viseme);
              
              wordIndex++;
            }, 250); // Adjust timing based on speech rate
          };

          utterance.onstart = () => {
            console.log('🎤 Web Speech API started - simulating lip-sync');
            simulateLipSync();
          };

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
            onClick={() => setShowPreBufferConfig(true)}
            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm"
            title="Configure Pre-buffering"
          >
            ⚡ Speed
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
