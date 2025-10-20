# Aisha Eye Tracking Backend - Render Deployment

This is the Python backend for Aisha's eye tracking and body following system.

## 🚀 Render Deployment Instructions

### Step 1: Go to Render Dashboard
1. Visit https://render.com
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"

### Step 2: Connect Repository
1. Connect your GitHub repo: `aisha-lipsync-avatar`
2. Select the repository

### Step 3: Configure Service
- **Name**: `aisha-eye-tracking-backend`
- **Root Directory**: `wawa-lipsync/examples/lipsync-demo/backend`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python render_start.py`
- **Plan**: Free

### Step 4: Environment Variables
Add these in Render dashboard:
- `PORT` = `8765`
- `PYTHONUNBUFFERED` = `1`

### Step 5: Deploy
Click "Create Web Service" and wait for deployment.

## 📡 WebSocket Endpoint
Once deployed, you'll get a URL like:
`https://aisha-eye-tracking-backend.onrender.com`

The WebSocket endpoint will be:
`wss://aisha-eye-tracking-backend.onrender.com`

## 🔧 Update Frontend
Update your frontend's WebSocket URL from:
```javascript
wsUrl: 'ws://localhost:8765'
```
to:
```javascript
wsUrl: 'wss://aisha-eye-tracking-backend.onrender.com'
```

## 📝 Files Included
- `render_start.py` - Render-optimized startup script
- `websocket_server.py` - WebSocket server with Render support
- `face_tracker.py` - Face detection using OpenCV/MediaPipe
- `avatar_controller.py` - Avatar movement calculations
- `requirements.txt` - Python dependencies

## 🎯 Features
- Real-time face detection
- Avatar eye tracking
- Body following movements
- WebSocket communication
- Render-optimized deployment
