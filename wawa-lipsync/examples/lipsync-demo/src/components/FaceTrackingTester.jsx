import { useEffect, useRef, useState } from 'react';
import { BrowserFaceTracking } from '../services/browserFaceTracking';

/**
 * Face Tracking Tester - Visualizes what the eye tracking system detects
 * Shows webcam feed with face detection boxes and tracking data
 * Uses browser-based MediaPipe - NO SERVER REQUIRED!
 */
export function FaceTrackingTester({ onTrackingData, isVisible }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceTrackerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const windowRef = useRef(null);
  
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  
  // Draggable window state
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isVisible) return;

    const startTracking = async () => {
      try {
        console.log('[FaceTrackingTester] Starting browser-based face tracking...');
        
        // Initialize MediaPipe face tracking (no WebSocket needed!)
        const tracker = new BrowserFaceTracking();
        
        const initialized = await tracker.initialize();
        if (!initialized) {
          setError('Failed to initialize MediaPipe face tracking');
          return;
        }

        // Get the video element from the tracker and connect it to our videoRef
        if (tracker.video && videoRef.current) {
          // Copy the stream from tracker's video to our display video
          videoRef.current.srcObject = tracker.video.srcObject;
          await videoRef.current.play();
          console.log('[FaceTrackingTester] Video element connected!');
        }

        // Setup callback for face detection
        tracker.onFaceDetected((faceData) => {
          setTrackingData(faceData);
          drawTracking(faceData);
          
          if (onTrackingData) {
            onTrackingData(faceData);
          }
        });

        // Start tracking
        await tracker.start();
        faceTrackerRef.current = tracker;
        setIsTracking(true);
        console.log('[FaceTrackingTester] ✅ Face tracking started!');

      } catch (err) {
        console.error('[FaceTrackingTester] Failed to start tracking:', err);
        setError(`Tracking error: ${err.message}`);
      }
    };

    startTracking();

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (faceTrackerRef.current) {
        faceTrackerRef.current.stop();
        faceTrackerRef.current = null;
      }
      
      console.log('[FaceTrackingTester] Cleanup complete');
    };
  }, [isVisible, onTrackingData]);

  const drawTracking = (data) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !data) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw face position visualization
    if (data.detected && data.x && data.y) {
      const x = data.x * canvas.width;
      const y = data.y * canvas.height;
      const size = (data.z || 0.5) * 100;
      
      // Draw center point
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw face bounding area
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x - size, 
        y - size, 
        size * 2, 
        size * 2
      );
      
      // Label
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('Face', x - size, y - size - 5);
    }
    
    // Draw tracking data overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 300, 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    
    let y = 30;
    const lineHeight = 20;
    
    ctx.fillText(`Status: ${data.detected ? '✅ Detected' : '⏳ Searching...'}`, 15, y);
    y += lineHeight;
    
    if (data.detected) {
      ctx.fillText(`Position: X=${(data.x * 100).toFixed(1)}% Y=${(data.y * 100).toFixed(1)}%`, 15, y);
      y += lineHeight;
      ctx.fillText(`Depth: ${((data.z || 0.5) * 100).toFixed(0)}%`, 15, y);
      y += lineHeight;
      if (data.confidence) {
        ctx.fillText(`Confidence: ${(data.confidence * 100).toFixed(0)}%`, 15, y);
      }
    }
  };

  // Draw loop
  useEffect(() => {
    if (!isVisible) return;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Canvas will be updated when tracking data arrives
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

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  if (!isVisible) return null;

  return (
    <div 
      ref={windowRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '640px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 10000,
        overflow: 'hidden',
        userSelect: isDragging ? 'none' : 'auto'
      }}>
      {/* Header */}
      <div className="drag-handle" style={{
        padding: '15px 20px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #404040',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            color: isTracking ? '#00ff00' : '#ff0000',
            fontWeight: 'bold'
          }}>
            🎯 Face Tracking Tester {isTracking ? '✅' : '❌'}
          </h3>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '3px' }}>
            Browser-based • No server needed
          </div>
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
          backgroundColor: isTracking ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
          borderRadius: '6px',
          border: `2px solid ${isTracking ? '#00ff00' : '#ff0000'}`,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ color: isTracking ? '#00ff00' : '#ff0000', fontWeight: 'bold', fontSize: '12px' }}>
            {isTracking ? 'Active' : 'Inactive'}
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
            <div>Face Detected: {trackingData.detected ? '✅ Yes' : '❌ No'}</div>
            {trackingData.detected && (
              <>
                <div>Position: X={(trackingData.x * 100).toFixed(1)}% Y={(trackingData.y * 100).toFixed(1)}%</div>
                <div>Depth: {((trackingData.z || 0.5) * 100).toFixed(0)}%</div>
                {trackingData.confidence && (
                  <div>Confidence: {(trackingData.confidence * 100).toFixed(0)}%</div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Calibration Controls */}
        <div style={{ 
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#252525',
          borderRadius: '8px',
          border: '1px solid #444'
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>
            🎯 Calibration
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <button
              onClick={() => {
                if (window.calibrateAisha) {
                  window.calibrateAisha();
                  alert('✅ Calibrated! Aisha should now look straight ahead when you\'re in this position.');
                } else {
                  alert('❌ Calibration not available. Make sure face tracking is active.');
                }
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              Set as Neutral
            </button>
            <button
              onClick={() => {
                if (window.resetCalibration) {
                  window.resetCalibration();
                  alert('🔄 Calibration reset!');
                }
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#555',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ color: '#aaa', fontSize: '11px', lineHeight: '1.4' }}>
            💡 Look straight at camera, then click "Set as Neutral"
          </div>
        </div>
      </div>
    </div>
  );
}
