#!/usr/bin/env python3
"""Quick verification that all dependencies are installed correctly."""

import sys

print("=" * 60)
print("  Verifying Eye Tracking Setup")
print("=" * 60)
print()

# Test imports
print("Testing imports...")
try:
    import cv2
    print("✅ OpenCV imported successfully (version: {})".format(cv2.__version__))
except ImportError as e:
    print("❌ OpenCV import failed:", e)
    sys.exit(1)

try:
    import mediapipe as mp
    print("✅ MediaPipe imported successfully (version: {})".format(mp.__version__))
except ImportError as e:
    print("❌ MediaPipe import failed:", e)
    sys.exit(1)

try:
    import websockets
    print("✅ WebSockets imported successfully (version: {})".format(websockets.__version__))
except ImportError as e:
    print("❌ WebSockets import failed:", e)
    sys.exit(1)

try:
    import numpy as np
    print("✅ NumPy imported successfully (version: {})".format(np.__version__))
except ImportError as e:
    print("❌ NumPy import failed:", e)
    sys.exit(1)

print()
print("Testing webcam access...")
try:
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        print("✅ Webcam is accessible")
        ret, frame = cap.read()
        if ret:
            print("✅ Can capture frames from webcam")
            print("   Frame size: {}x{}".format(frame.shape[1], frame.shape[0]))
        else:
            print("⚠️  Webcam opened but couldn't read frame")
        cap.release()
    else:
        print("❌ Could not open webcam")
        print("   Make sure webcam is connected and not in use by another app")
except Exception as e:
    print("❌ Error accessing webcam:", e)
    sys.exit(1)

print()
print("Testing MediaPipe Face Detection...")
try:
    mp_face_detection = mp.solutions.face_detection
    face_detection = mp_face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.5
    )
    print("✅ MediaPipe Face Detection initialized successfully")
    face_detection.close()
except Exception as e:
    print("❌ MediaPipe initialization failed:", e)
    sys.exit(1)

print()
print("=" * 60)
print("  ✅ All systems ready!")
print("=" * 60)
print()
print("You can now:")
print("  1. Test tracking: python test_tracking.py")
print("  2. Start server:  python start_tracking.py")
print("  3. Or use all-in-one: ./start_aisha_with_tracking.sh")
print()

