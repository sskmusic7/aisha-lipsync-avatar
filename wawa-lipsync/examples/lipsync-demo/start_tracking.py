#!/usr/bin/env python3
"""
Aisha Avatar Eye Tracking Server
Starts the WebSocket server for real-time face tracking and avatar control
"""

import sys
import asyncio
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from websocket_server import TrackingServer

def main():
    print("=" * 60)
    print("  Aisha Avatar Eye Tracking & Body Following System")
    print("=" * 60)
    print()
    print("Starting tracking server...")
    print("Make sure your webcam is connected and accessible.")
    print("The server will run on ws://localhost:8765")
    print()
    print("Press Ctrl+C to stop the server.")
    print()

    try:
        server = TrackingServer()
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\n")
        print("Shutting down tracking system...")
        print("Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\nError starting server: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure Python dependencies are installed:")
        print("   cd backend && pip install -r requirements.txt")
        print("2. Check that your webcam is connected and not in use")
        print("3. Verify port 8765 is not already in use")
        sys.exit(1)

if __name__ == "__main__":
    main()

