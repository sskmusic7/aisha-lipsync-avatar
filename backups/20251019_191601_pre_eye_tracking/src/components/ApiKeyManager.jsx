import { useState, useEffect } from "react";
import { geminiService } from "../services/geminiService";
import { ttsService } from "../services/ttsService";

export const ApiKeyManager = ({ onClose }) => {
  const [geminiKey, setGeminiKey] = useState("");
  const [ttsKey, setTtsKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    // Load existing keys from localStorage
    setGeminiKey(localStorage.getItem('gemini-api-key') || '');
    setTtsKey(localStorage.getItem('gcp-tts-api-key') || '');
  }, []);

  const handleSaveKeys = () => {
    if (geminiKey.trim()) {
      localStorage.setItem('gemini-api-key', geminiKey.trim());
      geminiService.setApiKey(geminiKey.trim());
    }
    
    if (ttsKey.trim()) {
      localStorage.setItem('gcp-tts-api-key', ttsKey.trim());
      ttsService.setApiKey(ttsKey.trim());
    }
    
    alert('API keys saved successfully!');
  };

  const handleClearKeys = () => {
    if (confirm('Are you sure you want to clear all API keys?')) {
      localStorage.removeItem('gemini-api-key');
      localStorage.removeItem('gcp-tts-api-key');
      setGeminiKey('');
      setTtsKey('');
      geminiService.clearApiKey();
      ttsService.clearApiKey();
      setTestResults({});
      alert('API keys cleared!');
    }
  };

  const testGeminiConnection = async () => {
    if (!geminiKey.trim()) {
      alert('Please enter a Gemini API key first');
      return;
    }

    setIsTesting(true);
    try {
      geminiService.setApiKey(geminiKey.trim());
      const success = await geminiService.testConnection();
      setTestResults(prev => ({ ...prev, gemini: success }));
      
      if (success) {
        alert('Gemini API connection successful!');
      } else {
        alert('Gemini API connection failed. Please check your API key.');
      }
    } catch (error) {
      console.error('Gemini test error:', error);
      setTestResults(prev => ({ ...prev, gemini: false }));
      alert(`Gemini API test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testTTSConnection = async () => {
    setIsTesting(true);
    try {
      if (ttsKey.trim()) {
        ttsService.setApiKey(ttsKey.trim());
      }
      
      const success = await ttsService.testTTS();
      setTestResults(prev => ({ ...prev, tts: success }));
      
      if (success) {
        alert('TTS connection successful!');
      } else {
        alert('TTS connection failed.');
      }
    } catch (error) {
      console.error('TTS test error:', error);
      setTestResults(prev => ({ ...prev, tts: false }));
      alert(`TTS test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">API Configuration</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Gemini API Key */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-700">
                  🤖 Gemini 2.0 API Key
                </h3>
                <div className="flex items-center gap-2">
                  {testResults.gemini !== undefined && (
                    <span className={`text-sm ${testResults.gemini ? 'text-green-600' : 'text-red-600'}`}>
                      {testResults.gemini ? '✅ Connected' : '❌ Failed'}
                    </span>
                  )}
                </div>
              </div>
              
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              
              <div className="flex gap-2 mb-3">
                <button
                  onClick={testGeminiConnection}
                  disabled={isTesting || !geminiKey.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>How to get your Gemini API key:</strong></p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Create API Key"</li>
                  <li>Copy the generated key and paste it above</li>
                </ol>
                <p className="mt-2 text-yellow-600">⚠️ <strong>Required:</strong> Gemini API is needed for AI responses</p>
              </div>
            </div>

            {/* Google Cloud TTS API Key */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-700">
                  🗣️ Google Cloud TTS API Key
                </h3>
                <div className="flex items-center gap-2">
                  {testResults.tts !== undefined && (
                    <span className={`text-sm ${testResults.tts ? 'text-green-600' : 'text-red-600'}`}>
                      {testResults.tts ? '✅ Working' : '❌ Failed'}
                    </span>
                  )}
                </div>
              </div>
              
              <input
                type="password"
                value={ttsKey}
                onChange={(e) => setTtsKey(e.target.value)}
                placeholder="Enter your Google Cloud TTS API key (optional)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              
              <div className="flex gap-2 mb-3">
                <button
                  onClick={testTTSConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-sm"
                >
                  {isTesting ? 'Testing...' : 'Test TTS'}
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>How to get your Google Cloud TTS API key:</strong></p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-500 hover:underline">Google Cloud Console</a></li>
                  <li>Create a new project or select existing one</li>
                  <li>Enable the "Text-to-Speech API"</li>
                  <li>Create credentials (API Key)</li>
                  <li>Copy the API key and paste it above</li>
                </ol>
                <p className="mt-2 text-blue-600">ℹ️ <strong>Optional:</strong> Without this key, we'll use Web Speech API (no lip-sync)</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleSaveKeys}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Save Configuration
              </button>
              <button
                onClick={handleClearKeys}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Clear All Keys
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
