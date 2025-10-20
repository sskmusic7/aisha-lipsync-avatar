# Quick Start Guide - Eye Tracking for Aisha

Get Aisha's eye tracking and body following up and running in 5 minutes!

## Step 1: Install Python Dependencies (2 minutes)

```bash
cd backend
pip install -r requirements.txt
```

Wait for the installation to complete. You should see packages being installed:
- opencv-python
- mediapipe
- websockets
- numpy

## Step 2: Test Your Setup (1 minute)

```bash
cd ..
python test_tracking.py
```

**What to expect:**
- Your webcam light should turn on
- You should see your face detection status in the terminal
- Move around and watch the values change
- Press 'q' to quit

If this works, you're ready! If not, check:
- ✅ Webcam is connected
- ✅ Webcam permissions are granted
- ✅ Good lighting on your face

## Step 3: Start the Tracking Server (30 seconds)

Open a new terminal window and run:

```bash
python start_tracking.py
```

**What to expect:**
```
==============================================================
  Aisha Avatar Eye Tracking & Body Following System
==============================================================

Starting tracking server...
The server will run on ws://localhost:8765
```

**Keep this terminal open!** This server needs to run while Aisha is active.

## Step 4: Start Aisha (30 seconds)

Open another terminal window and start the frontend:

```bash
npm run dev
```

**What to expect:**
- Browser opens with Aisha
- Console shows: `[AvatarTracking] Connected to tracking server`
- Aisha's eyes and head follow your movements!

## That's It! 🎉

Aisha should now be tracking your face and following your movements.

## Quick Tips

### Movement seems delayed?
- Move closer to the webcam
- Ensure good lighting
- Check CPU usage (close other apps)

### Aisha not moving?
- Check browser console for errors (F12)
- Verify tracking server is running
- Look for: `[AvatarTracking] Found bone: head -> Head`

### Too much movement during speech?
This is normal! Movement is automatically reduced when Aisha talks.

### Want to customize?
Edit `config/tracking_config.json` to adjust:
- Movement ranges
- Smoothing (responsiveness)
- Idle behavior

## Common Terminal Commands

**Stop tracking server:** Press `Ctrl+C` in the tracking server terminal

**Restart everything:**
1. Stop both servers (Ctrl+C)
2. Run tracking server: `python start_tracking.py`
3. Run frontend: `npm run dev`

## Need More Help?

See `EYE_TRACKING_README.md` for:
- Detailed troubleshooting
- Advanced configuration
- Architecture explanation
- Performance tuning

---

Enjoy your enhanced Aisha! 👁️✨

