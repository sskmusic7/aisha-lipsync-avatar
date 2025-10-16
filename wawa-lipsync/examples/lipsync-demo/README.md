# 🎤 A.Isha - AI Lipsync Avatar

An interactive 3D avatar with real-time lip-sync, powered by Google Gemini AI and advanced audio visualization.

## ✨ Features

- **Real-time Lip Sync**: Syllable-based mouth movements synchronized with speech
- **AI Chat Interface**: Powered by Google Gemini 2.0 API
- **Voice Input**: Speak to A.Isha using your microphone
- **Text-to-Speech**: Natural voice responses with Google Cloud TTS
- **Audio Visualization**: Real-time frequency analysis and spectrograms
- **Personality System**: A.Isha has her own unique personality, interests, and speaking style
- **Animation Controls**: Multiple body animations while maintaining facial expressions
- **Pre-buffered Audio**: Ultra-low latency lip-sync with delay compensation

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Google Cloud TTS API key ([Setup guide](https://cloud.google.com/text-to-speech/docs/before-you-begin))

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### API Keys Setup

The app will prompt you to enter your API keys on first launch:

1. **Gemini API Key**: Required for AI chat functionality
2. **Google Cloud TTS API Key**: Required for voice output and lip-sync

Keys are stored securely in your browser's localStorage.

## 🎨 Usage

### AI Chat Tab
- Click the microphone button to speak
- Or type your message and press Enter
- A.Isha will respond with voice and lip-sync animations

### Microphone Tab
- Toggle microphone to see live lip-sync from your voice
- Watch real-time audio visualization

### Audio Files Tab
- Upload audio files to test lip-sync
- Supports various audio formats

### Controls
- Adjust animation smoothness and responsiveness
- Switch between different body animations
- Configure pre-buffer settings for optimal sync

## 📦 Tech Stack

- **React** + **Vite** - Fast development and building
- **React Three Fiber** - 3D rendering with Three.js
- **wawa-lipsync** - Advanced lip-sync engine
- **Google Gemini 2.0** - AI conversation
- **Google Cloud TTS** - Text-to-speech synthesis
- **Tailwind CSS** - Modern styling
- **Leva** - Real-time controls

## 🌐 Deployment

### Netlify (Recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod
```

### Manual Deploy

1. Run `npm run build`
2. Upload the `dist` folder to your hosting service
3. Configure redirects for SPA routing (see `netlify.toml`)

## 📝 License

MIT

## 🙏 Credits

Created with ❤️ using cutting-edge web technologies