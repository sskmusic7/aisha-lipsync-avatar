import numpy as np
import time
from typing import Dict

class AvatarController:
    """Converts face positions to avatar movement commands."""
    
    def __init__(self):
        # Current rotations
        self.body_rotation = {'y': 0}
        self.head_rotation = {'x': 0, 'y': 0}
        self.eye_rotation = {'x': 0, 'y': 0}
        
        # Movement limits (in degrees)
        self.limits = {
            'body': {'y': 45},
            'head': {'x': 30, 'y': 25},
            'eye': {'x': 20, 'y': 15}
        }
        
        # Smoothing factors (0-1, higher = smoother)
        self.smoothing = {
            'body': 0.08,
            'head': 0.12,
            'eye': 0.25
        }
        
        # Idle animation parameters
        self.idle_time_start = time.time()
        self.last_detection_time = time.time()
    
    def calculate_movements(self, face_data: Dict) -> Dict:
        """
        Convert face position to avatar movements.
        Returns rotation values for body, head, and eyes.
        """
        current_time = time.time()
        
        if not face_data.get('detected'):
            # No face detected - switch to idle animation after 2 seconds
            if current_time - self.last_detection_time > 2.0:
                return self._get_idle_animation(current_time)
            # Return to center gradually
            return self._return_to_center()
        
        self.last_detection_time = current_time
        
        # Convert normalized coordinates to centered coordinates (-1 to 1)
        norm_x = (face_data['x'] - 0.5) * 2
        norm_y = (face_data['y'] - 0.5) * 2
        norm_z = face_data.get('z', 0.5)
        
        # Calculate target rotations based on face position
        movements = self._calculate_target_rotations(norm_x, norm_y, norm_z)
        
        # Apply smoothing
        self._apply_smoothing(movements)
        
        # Add micro-movements for realism
        self._add_micro_movements(current_time)
        
        return self._format_output()
    
    def _calculate_target_rotations(self, x: float, y: float, z: float) -> Dict:
        """Calculate target rotations based on normalized face position."""
        targets = {}
        
        # Body rotation (only horizontal, activates when face near edges)
        if abs(x) > 0.3:
            targets['body_y'] = x * self.limits['body']['y']
        else:
            targets['body_y'] = 0
        
        # Head rotation (follows face more closely)
        targets['head_x'] = x * self.limits['head']['x']
        targets['head_y'] = -y * self.limits['head']['y']  # Negative for natural movement
        
        # Eye rotation (most responsive, looks beyond head)
        targets['eye_x'] = x * self.limits['eye']['x'] * 1.5
        targets['eye_y'] = -y * self.limits['eye']['y'] * 1.5
        
        # Adjust for distance (z-axis)
        distance_factor = 1.0 + (0.5 - z) * 0.3
        for key in targets:
            targets[key] *= distance_factor
        
        return targets
    
    def _apply_smoothing(self, targets: Dict):
        """Apply smoothing to prevent jittery movements."""
        # Body smoothing
        if 'body_y' in targets:
            self.body_rotation['y'] += (
                targets['body_y'] - self.body_rotation['y']
            ) * self.smoothing['body']
        
        # Head smoothing
        if 'head_x' in targets:
            self.head_rotation['x'] += (
                targets['head_x'] - self.head_rotation['x']
            ) * self.smoothing['head']
        if 'head_y' in targets:
            self.head_rotation['y'] += (
                targets['head_y'] - self.head_rotation['y']
            ) * self.smoothing['head']
        
        # Eye smoothing
        if 'eye_x' in targets:
            self.eye_rotation['x'] += (
                targets['eye_x'] - self.eye_rotation['x']
            ) * self.smoothing['eye']
        if 'eye_y' in targets:
            self.eye_rotation['y'] += (
                targets['eye_y'] - self.eye_rotation['y']
            ) * self.smoothing['eye']
    
    def _add_micro_movements(self, current_time: float):
        """Add subtle natural movements."""
        # Subtle breathing motion
        breathing = np.sin(current_time * 0.3) * 0.5
        self.head_rotation['y'] += breathing
        
        # Micro eye movements
        eye_drift_x = np.sin(current_time * 1.7) * 0.3
        eye_drift_y = np.cos(current_time * 2.1) * 0.2
        self.eye_rotation['x'] += eye_drift_x
        self.eye_rotation['y'] += eye_drift_y
    
    def _get_idle_animation(self, current_time: float) -> Dict:
        """Generate idle animation when no face detected."""
        t = current_time - self.idle_time_start
        
        return {
            'body': {'y': np.sin(t * 0.1) * 5},
            'head': {
                'x': np.sin(t * 0.15) * 8,
                'y': np.cos(t * 0.2) * 5
            },
            'eyes': {
                'x': np.sin(t * 0.3) * 10,
                'y': np.cos(t * 0.25) * 5
            },
            'blink': np.random.random() < 0.005  # Random blinking
        }
    
    def _return_to_center(self) -> Dict:
        """Gradually return to center position."""
        decay = 0.05
        
        self.body_rotation['y'] *= (1 - decay)
        self.head_rotation['x'] *= (1 - decay)
        self.head_rotation['y'] *= (1 - decay)
        self.eye_rotation['x'] *= (1 - decay)
        self.eye_rotation['y'] *= (1 - decay)
        
        return self._format_output()
    
    def _format_output(self) -> Dict:
        """Format the output for sending to frontend."""
        return {
            'body': {'y': self.body_rotation['y']},
            'head': {
                'x': self.head_rotation['x'] - self.body_rotation['y'] * 0.3,
                'y': self.head_rotation['y']
            },
            'eyes': {
                'x': self.eye_rotation['x'] - self.head_rotation['x'] * 0.5,
                'y': self.eye_rotation['y'] - self.head_rotation['y'] * 0.5
            },
            'blink': np.random.random() < 0.008
        }

