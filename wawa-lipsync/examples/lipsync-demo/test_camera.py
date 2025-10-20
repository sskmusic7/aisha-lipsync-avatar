#!/usr/bin/env python3
"""
Test camera access and face detection
Shows camera feed with face detection overlay
"""

import cv2
import mediapipe as mp
import sys

def test_camera(camera_index=0):
    print(f"Testing camera {camera_index}...")
    print("Position yourself in front of the camera and press 'q' to quit")
    print("Look for green rectangles around your face")
    
    # Initialize MediaPipe
    mp_face_detection = mp.solutions.face_detection
    face_detection = mp_face_detection.FaceDetection(min_detection_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils
    
    # Initialize camera
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"❌ Could not open camera {camera_index}")
        return False
    
    print(f"✅ Camera {camera_index} opened successfully")
    print("Press 'q' to quit, 'n' for next camera")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to read from camera")
            break
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_detection.process(rgb_frame)
        
        # Draw face detection results
        if results.detections:
            for detection in results.detections:
                mp_drawing.draw_detection(frame, detection)
                print(f"✅ Face detected! Confidence: {detection.score[0]:.2f}")
        
        # Show frame
        cv2.imshow(f'Camera {camera_index} - Face Detection Test', frame)
        
        # Check for key press
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('n'):
            cap.release()
            cv2.destroyAllWindows()
            return test_camera(camera_index + 1)
    
    cap.release()
    cv2.destroyAllWindows()
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("  Camera and Face Detection Test")
    print("=" * 60)
    print()
    
    # Test cameras starting from 0
    test_camera(0)
