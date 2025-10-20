import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Dict

class FaceTracker:
    """Handles webcam capture and face detection using MediaPipe."""
    
    def __init__(self, camera_index: int = 0):
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 0: short-range, 1: full-range
            min_detection_confidence=0.5
        )
        
        # Initialize camera
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Smoothing parameters
        self.smooth_factor = 0.15
        self.current_position = {'x': 0.5, 'y': 0.5, 'z': 0.5}
        self.detection_confidence = 0.0
    
    def get_face_position(self) -> Optional[Dict]:
        """
        Capture frame and detect face position.
        Returns normalized coordinates (0-1) or None if no face detected.
        """
        ret, frame = self.cap.read()
        if not ret:
            return None
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb_frame)
        
        if results.detections and len(results.detections) > 0:
            # Get the first (most confident) detection
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box
            
            # Calculate center of face
            center_x = bbox.xmin + (bbox.width / 2)
            center_y = bbox.ymin + (bbox.height / 2)
            
            # Estimate depth based on face size
            face_size = bbox.width * bbox.height
            center_z = min(1.0, face_size * 4)  # Normalize to 0-1
            
            # Apply smoothing for stable tracking
            self.current_position['x'] += (center_x - self.current_position['x']) * self.smooth_factor
            self.current_position['y'] += (center_y - self.current_position['y']) * self.smooth_factor
            self.current_position['z'] += (center_z - self.current_position['z']) * self.smooth_factor
            
            self.detection_confidence = detection.score[0] if detection.score else 0.5
            
            return {
                'x': self.current_position['x'],
                'y': self.current_position['y'],
                'z': self.current_position['z'],
                'confidence': self.detection_confidence,
                'detected': True
            }
        
        return {'detected': False, 'confidence': 0.0}
    
    def release(self):
        """Clean up resources."""
        self.cap.release()
        cv2.destroyAllWindows()

