import cv2
import numpy as np
from typing import Optional, Dict
import time

class SimpleFaceTracker:
    """Simplified face tracker using OpenCV's built-in Haar cascades for Render deployment."""
    
    def __init__(self, camera_index: int = 0):
        # Use OpenCV's built-in face cascade (no MediaPipe dependency)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Initialize camera
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Smoothing parameters
        self.smooth_factor = 0.15
        self.current_position = {'x': 0.5, 'y': 0.5, 'z': 0.5}
        self.detection_confidence = 0.0
        
        # For demo purposes when no camera available
        self.demo_mode = False
        self.demo_time = time.time()
    
    def get_face_position(self) -> Optional[Dict]:
        """Capture frame and detect face position using OpenCV Haar cascades."""
        
        # Check if we're in a headless environment (like Render)
        if not self.cap.isOpened():
            return self._get_demo_position()
        
        ret, frame = self.cap.read()
        if not ret:
            return self._get_demo_position()
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        if len(faces) > 0:
            # Get the largest face
            face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = face
            
            # Calculate center of face
            center_x = (x + w/2) / frame.shape[1]  # Normalize to 0-1
            center_y = (y + h/2) / frame.shape[0]  # Normalize to 0-1
            
            # Estimate depth based on face size
            face_size = (w * h) / (frame.shape[0] * frame.shape[1])
            center_z = min(1.0, face_size * 4)
            
            # Apply smoothing for stable tracking
            self.current_position['x'] += (center_x - self.current_position['x']) * self.smooth_factor
            self.current_position['y'] += (center_y - self.current_position['y']) * self.smooth_factor
            self.current_position['z'] += (center_z - self.current_position['z']) * self.smooth_factor
            
            self.detection_confidence = 0.8  # High confidence for detected face
            
            return {
                'x': self.current_position['x'],
                'y': self.current_position['y'],
                'z': self.current_position['z'],
                'confidence': self.detection_confidence,
                'detected': True
            }
        
        return {'detected': False, 'confidence': 0.0}
    
    def _get_demo_position(self) -> Dict:
        """Generate demo face position for headless environments."""
        if not self.demo_mode:
            self.demo_mode = True
            print("Running in demo mode - no camera detected")
        
        # Generate smooth demo movement
        t = time.time() - self.demo_time
        demo_x = 0.5 + 0.2 * np.sin(t * 0.5)
        demo_y = 0.5 + 0.1 * np.cos(t * 0.3)
        demo_z = 0.6 + 0.1 * np.sin(t * 0.2)
        
        return {
            'x': demo_x,
            'y': demo_y,
            'z': demo_z,
            'confidence': 0.7,
            'detected': True
        }
    
    def release(self):
        """Clean up resources."""
        if self.cap.isOpened():
            self.cap.release()
        cv2.destroyAllWindows()
