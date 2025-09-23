// Gemini API Service
// This service handles communication with Google's Gemini 2.0 API

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  }

  // Set API key (can be set via environment variable or user input)
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Initialize with API key from environment or prompt user
  async initialize() {
    // Try to get API key from environment first
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!this.apiKey) {
      // If no environment variable, prompt user for API key
      this.apiKey = localStorage.getItem('gemini-api-key');
      
      if (!this.apiKey) {
        this.apiKey = prompt(
          'Please enter your Gemini API key\n\n' +
          'To get your free API key:\n' +
          '1. Go to https://makersuite.google.com/app/apikey\n' +
          '2. Create a new API key\n' +
          '3. Copy and paste it here\n\n' +
          'Your key will be stored locally in your browser.'
        );
        
        if (this.apiKey) {
          localStorage.setItem('gemini-api-key', this.apiKey);
        }
      }
    }
    
    return !!this.apiKey;
  }

  // Clear stored API key
  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('gemini-api-key');
  }

  // Send message to Gemini and get response
  async sendMessage(message, conversationHistory = []) {
    if (!this.apiKey) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Gemini API key is required');
      }
    }

    try {
      // Prepare the conversation context
      const systemPrompt = `You are a friendly and helpful AI assistant. You are integrated into a 3D avatar that can speak your responses aloud. Keep your responses conversational, engaging, and concise (ideally 1-3 sentences). You can see that the user can both type and speak to you, and you respond with both text and synthesized speech that animates the avatar's mouth.`;

      // Build the conversation context
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        contents.push({
          role: msg.type === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const requestBody = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
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
        console.error('Gemini API Error:', errorData);
        
        if (response.status === 401) {
          this.clearApiKey();
          throw new Error('Invalid API key. Please check your Gemini API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        } else {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error('Unexpected Gemini API response:', data);
        throw new Error('Unexpected response format from Gemini API');
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  // Test the API connection
  async testConnection() {
    try {
      const response = await this.sendMessage("Hello! Can you respond with just 'Connection successful'?");
      return response.toLowerCase().includes('successful');
    } catch (error) {
      console.error('Gemini API connection test failed:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const geminiService = new GeminiService();
