# Complete Environment Variables for Aisha Avatar
# This file contains all the API keys needed for full functionality

# ElevenLabs API Configuration (High-quality voice synthesis)
VITE_ELEVENLABS_API_KEY=sk_af16cdbcdea48bf817dc0b8af3af0c985e63f32f6099515b

# Google Gemini API Configuration (AI chat functionality)
VITE_GEMINI_API_KEY=your_gemini_key_here

# Google Cloud TTS API Configuration (Text-to-speech for lip-sync)
VITE_GCP_TTS_API_KEY=your_gcp_tts_key_here

# Google Calendar API Configuration (Calendar integration)
VITE_GOOGLE_CLIENT_ID=287783957820-4ovn_YOUR_FULL_CLIENT_ID_HERE
VITE_GOOGLE_API_KEY=your_gemini_key_here

# ========================================
# SETUP INSTRUCTIONS:
# ========================================

# 1. GEMINI API KEY:
#    - Go to: https://aistudio.google.com/app/apikey
#    - Create a new API key
#    - Replace "your_gemini_key_here" with your actual key
#    - Format: AIzaSy...

# 2. GOOGLE CLOUD TTS API KEY:
#    - Go to: https://console.cloud.google.com/apis/credentials
#    - Create a new API key
#    - Replace "your_gcp_tts_key_here" with your actual key
#    - Format: AIzaSy...

# 3. GOOGLE CALENDAR CLIENT ID:
#    - Go to: https://console.cloud.google.com/apis/credentials
#    - Find your "Aisha Calendar Integration" OAuth client
#    - Copy the full Client ID
#    - Replace "287783957820-4ovn_YOUR_FULL_CLIENT_ID_HERE" with your actual Client ID
#    - Format: 287783957820-4ovn...apps.googleusercontent.com

# 4. GOOGLE CALENDAR API KEY:
#    - Can use the same key as Gemini API
#    - Or create a separate API key for Calendar API

# ========================================
# NETLIFY DEPLOYMENT:
# ========================================
# Add these same variables to your Netlify environment variables:
# - VITE_ELEVENLABS_API_KEY
# - VITE_GEMINI_API_KEY  
# - VITE_GCP_TTS_API_KEY
# - VITE_GOOGLE_CLIENT_ID
# - VITE_GOOGLE_API_KEY

# ========================================
# FEATURES ENABLED:
# ========================================
# ✅ AI Chat (Gemini API)
# ✅ High-quality Voice (ElevenLabs API)
# ✅ Lip-sync Animation (Google Cloud TTS)
# ✅ Calendar Integration (Google Calendar API)
# ✅ Eye Tracking (Python backend)
# ✅ Real-time WebSocket communication
