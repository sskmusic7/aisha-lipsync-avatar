#!/bin/bash

# Aisha Avatar - Start with Eye Tracking
# This script starts both the tracking server and the frontend

echo "=============================================================="
echo "  Starting Aisha Avatar with Eye Tracking"
echo "=============================================================="
echo ""

# Check if Python dependencies are installed
if ! python3 -c "import cv2, mediapipe, websockets, numpy" 2>/dev/null; then
    echo "⚠️  Python dependencies not found!"
    echo ""
    echo "Please install them first:"
    echo "  cd backend && pip install -r requirements.txt"
    echo ""
    exit 1
fi

# Check if Node modules are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  Node modules not found!"
    echo ""
    echo "Please install them first:"
    echo "  npm install"
    echo ""
    exit 1
fi

echo "✅ Dependencies check passed"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down Aisha..."
    kill $TRACKING_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start tracking server in background
echo "🎥 Starting eye tracking server..."
python3 start_tracking.py &
TRACKING_PID=$!
sleep 2

# Check if tracking server started successfully
if ! ps -p $TRACKING_PID > /dev/null; then
    echo "❌ Failed to start tracking server"
    exit 1
fi

echo "✅ Eye tracking server running (PID: $TRACKING_PID)"
echo ""

# Start frontend
echo "🚀 Starting Aisha frontend..."
echo ""
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=============================================================="
echo "  Aisha is running with eye tracking!"
echo "=============================================================="
echo ""
echo "Tracking Server: ws://localhost:8765 (PID: $TRACKING_PID)"
echo "Frontend: Check terminal output above for URL"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait

