import asyncio
import json
import logging
import os
from aiohttp import web, WSMsgType
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
        self.app = web.Application()
        self.setup_routes()
    
    def setup_routes(self):
        """Set up HTTP routes."""
        self.app.router.add_get('/health', self.health_check)
        self.app.router.add_get('/', self.health_check)
        self.app.router.add_get('/ws', self.websocket_handler)
    
    async def health_check(self, request):
        """Handle health check requests."""
        return web.json_response({
            "status": "healthy",
            "service": "aisha-eye-tracking",
            "websocket_endpoint": f"ws://{self.host}:{self.port}/ws"
        })
    
    async def websocket_handler(self, request):
        """Handle WebSocket connections."""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        self.clients.add(ws)
        logger.info(f"New client connected. Total clients: {len(self.clients)}")
        
        tracker = SimpleFaceTracker()
        controller = AvatarController()
        
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    if msg.data == 'close':
                        await ws.close()
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f'WebSocket error: {ws.exception()}')
                
                # Get face position
                face_data = tracker.get_face_position()
                
                # Calculate avatar movements
                movements = controller.calculate_movements(face_data)
                
                # Send to client
                await ws.send_str(json.dumps(movements))
                
                # Control frame rate (30 FPS)
                await asyncio.sleep(1/30)
                
        except Exception as e:
            logger.error(f"Error: {e}")
        finally:
            self.clients.discard(ws)
            tracker.release()
        
        return ws
    
    async def start(self):
        """Start the server."""
        logger.info(f"Starting tracking server on {self.host}:{self.port}")
        logger.info(f"Health check: http://{self.host}:{self.port}/health")
        logger.info(f"WebSocket: ws://{self.host}:{self.port}/ws")
        
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        
        # Keep running
        try:
            await asyncio.Future()
        except KeyboardInterrupt:
            logger.info("Shutting down server...")
            await runner.cleanup()
