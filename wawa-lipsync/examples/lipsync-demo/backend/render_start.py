#!/usr/bin/env python3
"""
Startup script for Render deployment
This script handles the Render environment setup
"""

import os
import sys
import asyncio
from websocket_server import TrackingServer

def main():
    # Get port from Render environment
    port = int(os.environ.get('PORT', 8765))
    
    print(f"Starting Aisha Eye Tracking Server on port {port}")
    print("Environment: Render")
    print("Using simplified face tracker (OpenCV only)")
    
    # Create server with Render port
    server = TrackingServer(host='0.0.0.0', port=port)
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\nShutting down server...")
        sys.exit(0)

if __name__ == "__main__":
    main()
