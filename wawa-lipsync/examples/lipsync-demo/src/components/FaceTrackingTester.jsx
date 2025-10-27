import { useEffect, useRef, useState } from 'react';

/**
 * Face Tracking Tester - Visualizes what the eye tracking system detects
 * Shows webcam feed with face detection boxes and tracking data
 */
export function FaceTrackingTester({ onTrackingData, isVisible }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isVisible) return;

    let stream = null;
    
    const startTracking = async () => {
      try {
        // Get webcam access
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user' 
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('[FaceTrackingTester] Webcam started');
        }

        // Connect to WebSocket tracking server
        connectWebSocket();
        
      } catch (err) {
        console.error('[FaceTrackingTester] Failed to start webcam:', err);
        setError(`Webcam error: ${err.message}`);
      }
    };

    const connectWebSocket = () => {
      try {
        // Try local first, then production
        const wsUrl = 'ws://localhost:8765';
        
        console.log('[FaceTrackingTester] Connecting to tracking server:', wsUrl);
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('[FaceTrackingTester] Connected to tracking server');
          setIsConnected(true);
          setError(null);
          
          // Send video stream signal
          wsRef.current.send(JSON.stringify({ type: 'start_tracking' }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'tracking_data') {
              setTrackingData(data.data);
              
              // Draw tracking visualization
              drawTracking(data.data);
              
              // Pass to parent if callback provided
              if (onTrackingData) {
                onTrackingData(data.data);
              }
            }
          } catch (err) {
            console.error('[FaceTrackingTester] Error parsing tracking data:', err);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('[FaceTrackingTester] WebSocket error:', error);
          setError('Could not connect to tracking server');
          setIsConnected(false);
        };

        wsRef.current.onclose = () => {
          console.log('[FaceTrackingTester] Disconnected from tracking server');
          setIsConnected(false);
          
          // Try to reconnect after 3 seconds
          setTimeout(() => {
            if (isVisible && videoRef.current?.srcObject) {
              connectWebSocket();
            }
          }, 3000);
        };

      } catch (err) {
        console.error('[FaceTrackingTester] Failed to create WebSocket:', err);
        setError(`Connection error: ${err.message}`);
      }
    };

    startTracking();

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      console.log('[FaceTrackingTester] Cleanup complete');
    };
  }, [isVisible, onTrackingData]);

  const drawTracking = (data) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !data) return;

    const ctx = canvas.getContext('2d');
    
    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw face bounding box
    if (data.faceBox) {
      const { x, y, width, height } = data.faceBox;
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Label
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Face', x, y - 10);
    }
    
    // Draw eye boxes
    if (data.eyes) {
      ctx.strokeStyle = '#0080ff';
      ctx.lineWidth = 2;
      
      // Left eye
      if (data.eyes.leftEye) {
        const { x, y, width, height } = data.eyes.leftEye;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#0080ff';
        ctx.font = '14px sans-serif';
        ctx.fillText('Left Eye', x, y - 5);
      }
      
      // Right eye
      if (data.eyes.rightEye) {
        const { x, y, width, height } = data.eyes.rightEye;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#0080ff';
        ctx.font = '14px sans-serif';
        ctx.fillText('Right Eye', x, y - 5);
      }
    }
    
    // Draw tracking data overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 300, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    
    let y = 30;
    const lineHeight = 20;
    
    if (data.head) {
      ctx.fillText(`Head: X=${data.head.x.toFixed(1)}° Y=${data.head.y.toFixed(1)}°`, 15, y);
      y += lineHeight;
    }
    
    if (data.eyes && data.eyes.gaze) {
      ctx.fillText(`Gaze: X=${data.eyes.gaze.x.toFixed(1)}° Y=${data.eyes.gaze.y.toFixed(1)}°`, 15, y);
      y += lineHeight;
    }
    
    if (data.body) {
      ctx.fillText(`Body: Y=${data.body.y.toFixed(1)}°`, 15, y);
      y += lineHeight;
    }
    
    ctx.fillText(`Confidence: ${((data.confidence || 0) * 100).toFixed(0)}%`, 15, y);
  };

  // Draw loop
  useEffect(() => {
    if (!isVisible) return;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Draw current video frame
        const ctx = canvas.getContext('2d');
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      animationFrameRef.current = requestAnimationFrame(drawLoop);
    };

    animationFrameRef.current = requestAnimationFrame(drawLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '640px',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 10000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #404040',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            color: isConnected ? '#00ff00' : '#ff0000',
            fontWeight: 'bold'
          }}>
            🎯 Face Tracking Tester
            {isConnected ? ' ✅' : ' ❌'}
          </h3>
        </div>
      </div>

      {/* Video/Canvas Area */}
      <div style={{ position: 'relative', backgroundColor: '#000' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ 
            width: '100%', 
            height: 'auto',
            display: 'none' 
          }} 
        />
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%', 
            height: 'auto',
            display: 'block'
          }} 
        />
        
        {/* Status Overlay */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          padding: '8px 12px',
          backgroundColor: isConnected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
          borderRadius: '6px',
          border: `2px solid ${isConnected ? '#00ff00' : '#ff0000'}`,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ color: isConnected ? '#00ff00' : '#ff0000', fontWeight: 'bold', fontSize: '12px' }}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div style={{ padding: '15px' }}>
        {error && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#ff0000', 
            color: 'white', 
            borderRadius: '6px',
            marginBottom: '10px',
            fontSize: '12px'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        {trackingData && (
          <div style={{
            padding: '10px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#00ff00'
          }}>
            <div><strong>Tracking Data:</strong></div>
            <div>Face Detected: {trackingData.faceBox ? '✅' : '❌'}</div>
            {trackingData.head && (
              <div>Head Rotation: X={trackingData.head.x.toFixed(1)}° Y={trackingData.head.y.toFixed(1)}°</div>
            )}
            {trackingData.eyes && trackingData.eyes.gaze && (
              <div>Eye Gaze: X={trackingData.eyes.gaze.x.toFixed(1)}° Y={trackingData.eyes.gaze.y.toFixed(1)}°</div>
            )}
            {trackingData.blink && (
              <div>Blinking: Detected</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

