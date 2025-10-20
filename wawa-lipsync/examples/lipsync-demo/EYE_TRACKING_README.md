# Aisha Avatar Eye Tracking & Body Following

This implementation adds real-time eye tracking and body rotation to your Aisha 3D AI avatar, enabling her to follow you through webcam detection.

## Features

- **Real-time face detection** using MediaPipe
- **Eye tracking** - Aisha's eyes follow your position
- **Head rotation** - Natural head movements following your face
- **Body rotation** - Subtle body rotation when you move side to side
- **Idle animations** - Natural movements when no face is detected
- **Lipsync integration** - Reduced movement during speech for realism
- **WebSocket communication** - Low-latency real-time updates

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Webcam Input    │───▶│ Python Backend   │───▶│ Frontend (3D)   │
│ (OpenCV)        │    │ (Face Tracking)  │    │ (Three.js)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              ▲▼
                       WebSocket Server
                       (Movement Data)
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- Webcam access
- Your existing Aisha avatar setup

## Installation

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- opencv-python (face detection)
- mediapipe (face tracking)
- websockets (real-time communication)
- numpy (calculations)

### 2. Verify Installation

Test the tracking system:

```bash
python test_tracking.py
```

You should see face detection working in your terminal. Press 'q' to quit.

## Usage

### Starting the System

#### Terminal 1 - Start the tracking server:

```bash
python start_tracking.py
```

You should see:
```
==============================================================
  Aisha Avatar Eye Tracking & Body Following System
==============================================================

Starting tracking server...
Make sure your webcam is connected and accessible.
The server will run on ws://localhost:8765

Press Ctrl+C to stop the server.

INFO:__main__:Starting tracking server on localhost:8765
```

#### Terminal 2 - Start your Aisha frontend:

```bash
npm run dev
```

The frontend will automatically connect to the tracking server and Aisha will start following your movements!

## Configuration

Edit `config/tracking_config.json` to customize:

- **Movement limits** - How far Aisha can rotate
- **Smoothing factors** - How smooth vs responsive movements are
- **Idle animations** - Behavior when no face detected
- **Blinking settings** - Natural eye blinking
- **WebSocket settings** - Server host and port

## File Structure

```
lipsync-demo/
├── backend/
│   ├── face_tracker.py          # Face detection with MediaPipe
│   ├── avatar_controller.py     # Movement calculations
│   ├── websocket_server.py      # Real-time communication
│   └── requirements.txt         # Python dependencies
│
├── config/
│   └── tracking_config.json     # Configuration settings
│
├── src/
│   ├── components/
│   │   └── Avatar.jsx           # Modified with tracking integration
│   └── services/
│       └── avatarTracking.js    # Frontend tracking client
│
├── start_tracking.py            # Server startup script
├── test_tracking.py             # Testing script
└── EYE_TRACKING_README.md       # This file
```

## How It Works

### Backend (Python)

1. **face_tracker.py** - Uses OpenCV and MediaPipe to:
   - Capture webcam frames
   - Detect face position (x, y, z coordinates)
   - Apply smoothing for stable tracking

2. **avatar_controller.py** - Converts face position to:
   - Body rotation (when face near edges)
   - Head rotation (follows face closely)
   - Eye rotation (most responsive)
   - Idle animations (when no face detected)

3. **websocket_server.py** - Handles:
   - Client connections
   - Real-time data transmission (30 FPS)
   - Multiple client support

### Frontend (JavaScript/React)

1. **avatarTracking.js** - Client-side tracking that:
   - Connects to WebSocket server
   - Finds avatar bones (body, head, neck, eyes)
   - Applies rotations to 3D model
   - Handles reconnection

2. **Avatar.jsx** - Integration:
   - Initializes tracking system
   - Coordinates with lipsync
   - Reduces movement during speech

## Troubleshooting

### "No face detected"
- Check webcam permissions
- Ensure good lighting
- Position your face centered in frame
- Try increasing `detection_confidence` in config

### "WebSocket connection failed"
- Verify tracking server is running
- Check firewall settings
- Ensure port 8765 is not in use
- Try `lsof -i :8765` to check port

### "Avatar bones not found"
- Check avatar model bone naming
- Avatar must have bones named: Hips, Spine, Head, Neck, LeftEye, RightEye
- Or mixamo equivalents: mixamorigHips, mixamorigHead, etc.

### High CPU usage
- Reduce FPS in `websocket_server.py` (line: `await asyncio.sleep(1/30)`)
- Increase to `1/15` for 15 FPS
- Close other camera applications

### Jittery movements
- Increase smoothing factors in `config/tracking_config.json`
- Higher values = smoother but less responsive
- Try: body: 0.1, head: 0.15, eyes: 0.3

## Advanced Configuration

### Adjusting Movement Ranges

In `backend/avatar_controller.py`, modify the limits:

```python
self.limits = {
    'body': {'y': 45},     # Body rotation limit in degrees
    'head': {'x': 30, 'y': 25},  # Head rotation limits
    'eye': {'x': 20, 'y': 15}    # Eye rotation limits
}
```

### Customizing Smoothing

Different smoothing per body part:

```python
self.smoothing = {
    'body': 0.08,   # Slowest (most smooth)
    'head': 0.12,   # Medium
    'eye': 0.25     # Fastest (most responsive)
}
```

### Idle Animation Timing

Change when idle mode activates:

```python
# In avatar_controller.py
if current_time - self.last_detection_time > 2.0:  # Change 2.0 to your preference
    return self._get_idle_animation(current_time)
```

## Performance Tips

1. **Reduce detection frequency** - Process every 3rd frame:
   ```python
   if frame_count % 3 == 0:
       face_data = tracker.get_face_position()
   ```

2. **Lower resolution** - In `face_tracker.py`:
   ```python
   self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
   self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
   ```

3. **Reduce WebSocket frequency** - Lower FPS for less bandwidth

## Integration Notes

- Eye tracking works alongside existing lipsync
- Movement is automatically reduced during speech
- Blinking is handled by the existing Avatar component
- No changes needed to lipsync configuration

## Privacy & Security

- All face detection runs **locally** on your machine
- No data is sent to external servers
- Webcam feed is **not recorded** or stored
- Only face position coordinates are transmitted via WebSocket

## Future Enhancements

Possible additions:
- Emotion detection using facial landmarks
- Gesture recognition
- Multi-user tracking support
- Calibration interface
- Voice activity detection integration

## Credits

Based on the guide: "Aisha Avatar Eye Tracking & Body Following Implementation Guide"

Technologies used:
- [MediaPipe](https://google.github.io/mediapipe/) for face detection
- [OpenCV](https://opencv.org/) for webcam capture
- [Three.js](https://threejs.org/) for 3D rendering
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) for React integration
- [websockets](https://websockets.readthedocs.io/) for real-time communication

## Support

If you encounter issues:
1. Check this README's troubleshooting section
2. Verify all prerequisites are installed
3. Test with `test_tracking.py` first
4. Check console logs in both terminal and browser

---

Enjoy your enhanced Aisha avatar with natural eye tracking and body following! 👁️✨

