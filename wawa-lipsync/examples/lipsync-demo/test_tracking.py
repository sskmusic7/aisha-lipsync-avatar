#!/usr/bin/env python3
"""
Test script for Aisha Avatar Eye Tracking
Tests face detection and movement calculations without WebSocket
"""

import sys
import os
import json

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from face_tracker import FaceTracker
from avatar_controller import AvatarController

def test_tracking():
    """Test the tracking system without WebSocket."""
    print("=" * 60)
    print("  Aisha Avatar Tracking Test")
    print("=" * 60)
    print()
    print("Testing face detection and avatar movement calculations...")
    print("Position yourself in front of your webcam.")
    print("Press 'q' in the terminal to quit.")
    print()

    tracker = FaceTracker()
    controller = AvatarController()

    print("Starting tracking test...")
    print()

    try:
        frame_count = 0
        while True:
            face_data = tracker.get_face_position()
            movements = controller.calculate_movements(face_data)

            # Print formatted output every 10 frames
            if frame_count % 10 == 0:
                if face_data and face_data.get('detected'):
                    print(f"\r✓ Face detected | " +
                          f"Position: ({face_data['x']:.2f}, {face_data['y']:.2f}, {face_data['z']:.2f}) | " +
                          f"Confidence: {face_data['confidence']:.2f} | " +
                          f"Body: {movements['body']['y']:.1f}° | " +
                          f"Head: ({movements['head']['x']:.1f}°, {movements['head']['y']:.1f}°) | " +
                          f"Eyes: ({movements['eyes']['x']:.1f}°, {movements['eyes']['y']:.1f}°)",
                          end="", flush=True)
                else:
                    print(f"\r✗ No face detected - Idle mode active" + " " * 50, end="", flush=True)

            frame_count += 1

            # Check for quit (this is a simple check, won't work in all terminals)
            import cv2
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("\n")
        print("Test interrupted by user")
    except Exception as e:
        print(f"\nError during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        tracker.release()
        print("\n")
        print("Test completed. Cleaning up...")

if __name__ == "__main__":
    try:
        test_tracking()
    except Exception as e:
        print(f"Failed to run test: {e}")
        print("\nMake sure you have installed the required dependencies:")
        print("  cd backend && pip install -r requirements.txt")
        sys.exit(1)

