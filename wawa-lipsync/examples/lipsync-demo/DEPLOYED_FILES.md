# Netlify Deployment - Actual Files Used

This document lists **only the files and directories** that are actually deployed to Netlify and used in production.

## Build Configuration

- **Base Directory**: `wawa-lipsync/examples/lipsync-demo`
- **Build Command**: `npm run build` (runs `vite build`)
- **Output Directory**: `dist/` (generated during build)
- **Config File**: `netlify.toml`

## Source Files (Deployed to Netlify)

### Core Application Files
```
wawa-lipsync/examples/lipsync-demo/
├── index.html                    # Main HTML entry point
├── vite.config.js                # Vite build configuration
├── package.json                  # Dependencies and build scripts
├── netlify.toml                  # Netlify deployment config
├── jsconfig.json                # JavaScript config
└── env.example                  # Environment variable template
```

### Source Code (`src/`)
```
src/
├── main.jsx                      # React app entry point
├── App.jsx                       # Main app component
├── index.css                     # Global styles
│
├── components/                    # React components
│   ├── ChatInterface.jsx        # Main chat UI (Google APIs integration)
│   ├── Avatar.jsx               # 3D avatar rendering
│   ├── Experience.jsx           # Three.js scene setup
│   ├── UI.jsx                   # UI controls
│   ├── ApiKeyManager.jsx        # API key management
│   ├── VoiceSelector.jsx        # Voice selection
│   ├── Visualizer.jsx           # Audio visualizer
│   ├── FaceTrackingTester.jsx   # Face tracking test
│   ├── GradientSky.jsx          # Background gradient
│   ├── DebugEnv.jsx             # Debug component
│   └── EnvDebug.jsx            # Environment debug
│
├── services/                     # Service layer
│   ├── aishaBackendService.js   # Backend API client (Google services)
│   ├── geminiService.js         # Gemini AI integration
│   ├── ttsService.js            # Text-to-speech service
│   ├── elevenLabsService.js     # ElevenLabs TTS
│   ├── googleCalendarService.js # Google Calendar (legacy)
│   ├── aishaPersonalityRules.js # Aisha personality/behavior
│   ├── syllableAnalyzer.js     # Speech analysis
│   ├── browserFaceTracking.js  # Face tracking (MediaPipe)
│   ├── browserAvatarTracking.js # Avatar movement logic
│   └── avatarTracking.js       # Avatar tracking utilities
│
├── stores/
│   └── ttsStore.js              # Zustand store for TTS state
│
├── lib/
│   └── wawa-lipsync/           # Lipsync library (local)
│       ├── index.ts
│       ├── lipsync.ts
│       ├── types.d.ts
│       ├── visemes.ts
│       └── utils/
│           └── mathUtil.ts
│
└── assets/
    ├── mic.png                  # Microphone icon
    └── react.svg                # React logo
```

### Public Assets (`public/`)
```
public/
├── favicon.ico                  # Site favicon
├── vite.svg                     # Vite logo
├── models/                      # 3D avatar models
│   ├── wawalipavatar.glb       # Main avatar model
│   ├── animations.glb          # Animation data
│   └── 64f1a714fe61576b46f27ca2.glb
├── images/                      # Images
│   ├── wawasensei.png
│   └── wawasensei-white.png
├── textures/                    # Avatar textures (96 PNG files)
└── audios/                      # Sample audio files (not used in production)
```

## Backend (NOT Deployed to Netlify)

The backend is deployed separately to **Google Cloud Run**:

```
wawa-lipsync/examples/lipsync-demo/backend/node/
├── src/
│   ├── server.js                # Express server
│   ├── orchestrator.js          # Service orchestrator
│   ├── services/
│   │   └── index.js             # Google API services
│   └── utils/
├── package.json
├── Dockerfile
├── cloudbuild.yaml
└── deploy-gcp.sh
```

**Backend URL**: `https://aisha-backend-287783957820.us-central1.run.app`

## Files NOT Used in Netlify Deployment

These files exist in the repo but are **NOT deployed to Netlify**:

- `backend/` (Python files) - Old Python backend, not used
- `backend/node/` - Deployed to Cloud Run, not Netlify
- `config/` - Not used in frontend
- `*.py` files - Python scripts not used
- `*.sh` files - Shell scripts not used
- `*.md` documentation files - Not deployed
- `Dockerfile`, `fly.toml` - Not used for Netlify
- `node_modules/` - Installed during build, not in repo
- `dist/` - Generated during build, not in repo

## Build Process

1. Netlify runs `npm run build` in `wawa-lipsync/examples/lipsync-demo`
2. Vite bundles all files from `src/` and `public/`
3. Output goes to `dist/`
4. Netlify serves `dist/` as static files

## Environment Variables (Set in Netlify Dashboard)

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_API_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_ELEVENLABS_API_KEY`
- `VITE_AISHA_BACKEND_URL` (points to Cloud Run backend)

## Summary

**Netlify Deployment = Frontend Only**
- React app (`src/`)
- Static assets (`public/`)
- Build config (`vite.config.js`, `netlify.toml`)

**Cloud Run Deployment = Backend Only**
- Node.js API server (`backend/node/src/`)
- Google API integrations
- OAuth token storage (Secret Manager)

