import asyncio
import json
import websockets
import logging
import os
from http.server import BaseHTTPRequestHandler
from http.server import HTTPServer
import threading
from simple_face_tracker import SimpleFaceTracker
from avatar_controller import AvatarController

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HealthCheckHandler(BaseHTTPRequestHandler):
    """Handle HTTP health check requests from Render."""
    
    def do_GET(self):
        """Handle GET requests (health checks)."""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "status": "healthy",
            "service": "aisha-eye-tracking",
            "websocket_port": self.server.websocket_port
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_HEAD(self):
        """Handle HEAD requests (Render health checks)."""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Suppress HTTP server logs."""
        pass

class TrackingServer:
    def __init__(self, host='0.0.0.0', port=None):
        self.host = host
        self.port = port or int(os.environ.get('PORT', 8765))
        self.clients = set()
        
        # Start HTTP server for health checks on a different port
        self.http_port = self.port + 1
        self.http_server = None
        
    async def handle_client(self, websocket):
        """Handle individual client connection."""
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
    
    def start_http_server(self):
        """Start HTTP server for health checks."""
        def handler(*args, **kwargs):
            HealthCheckHandler.websocket_port = self.port
            HealthCheckHandler(*args, **kwargs)
        
        self.http_server = HTTPServer((self.host, self.http_port), handler)
        logger.info(f"HTTP health check server started on port {self.http_port}")
        
        # Run HTTP server in a separate thread
        def run_server():
            self.http_server.serve_forever()
        
        thread = threading.Thread(target=run_server, daemon=True)
        thread.start()
    
    async def start(self):
        """Start the WebSocket server."""
        # Start HTTP server for health checks
        self.start_http_server()
        
        logger.info(f"Starting tracking server on {self.host}:{self.port}")
        logger.info(f"Health check endpoint: http://{self.host}:{self.http_port}")
        
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()  # Run forever
