#!/usr/bin/env python3
"""
Debug version of the tracking server with verbose output
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from face_tracker import FaceTracker
from avatar_controller import AvatarController
import json

def debug_tracking():
    print("=" * 60)
    print("  Debug Face Tracking")
    print("=" * 60)
    print()
    
    tracker = FaceTracker()
    controller = AvatarController()
    
    print("Starting debug tracking...")
    print("Position yourself in front of the camera")
    print("Press Ctrl+C to stop")
    print()
    
    frame_count = 0
    
    try:
        while True:
            face_data = tracker.get_face_position()
            movements = controller.calculate_movements(face_data)
            
            frame_count += 1
            
            # Print detailed info every 30 frames (1 second at 30fps)
            if frame_count % 30 == 0:
                if face_data and face_data.get('detected'):
                    print(f"✅ Frame {frame_count}: Face detected!")
                    print(f"   Position: x={face_data['x']:.3f}, y={face_data['y']:.3f}, z={face_data['z']:.3f}")
                    print(f"   Confidence: {face_data['confidence']:.3f}")
                    print(f"   Movements: body={movements['body']['y']:.1f}°, head=({movements['head']['x']:.1f}°, {movements['head']['y']:.1f}°)")
                    print()
                else:
                    print(f"❌ Frame {frame_count}: No face detected")
                    print(f"   Face data: {face_data}")
                    print()
            
            # Also print every 10 frames for more frequent updates
            elif frame_count % 10 == 0:
                if face_data and face_data.get('detected'):
                    print(f"✅ Frame {frame_count}: Face detected (confidence: {face_data['confidence']:.2f})")
                else:
                    print(f"❌ Frame {frame_count}: No face detected")
    
    except KeyboardInterrupt:
        print("\n")
        print("Debug tracking stopped")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        tracker.release()
        print("Camera released")

if __name__ == "__main__":
    debug_tracking()
