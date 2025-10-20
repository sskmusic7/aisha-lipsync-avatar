import asyncio
import json
import websockets
import logging
import os
from simple_face_tracker import SimpleFaceTracker
from avatar_controller import AvatarController

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrackingServer:
    def __init__(self, host='0.0.0.0', port=None):
        self.host = host
        self.port = port or int(os.environ.get('PORT', 8765))
        self.clients = set()
    
    async def handle_client(self, websocket, path):
        """Handle individual client connection."""
        # Check if this is a health check request
        if path == '/health' or path == '/':
            # Send HTTP-like response for health checks
            await websocket.send("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n" + 
                                json.dumps({"status": "healthy", "service": "aisha-eye-tracking"}))
            await websocket.close()
            return
        
        # Handle WebSocket connections
        self.clients.add(websocket)
        logger.info(f"New client connected. Total clients: {len(self.clients)}")
        
        tracker = SimpleFaceTracker()
        controller = AvatarController()
        
        try:
            while True:
                # Get face position
                face_data = tracker.get_face_position()
                
                # Calculate avatar movements
                movements = controller.calculate_movements(face_data)
                
                # Send to client
                await websocket.send(json.dumps(movements))
                
                # Control frame rate (30 FPS)
                await asyncio.sleep(1/30)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Error: {e}")
        finally:
            self.clients.discard(websocket)
            tracker.release()
    
    async def start(self):
        """Start the WebSocket server."""
        logger.info(f"Starting tracking server on {self.host}:{self.port}")
        logger.info(f"Health check endpoint: http://{self.host}:{self.port}/health")
        
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()  # Run forever
