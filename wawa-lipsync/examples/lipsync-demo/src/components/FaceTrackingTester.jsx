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
        
        // Wait for video element to be ready
        if (!videoRef.current) {
          console.warn('[FaceTrackingTester] Video ref not ready, retrying...');
          setTimeout(startTracking, 100);
          return;
        }

        // Initialize MediaPipe face tracking (no WebSocket needed!)
        const tracker = new BrowserFaceTracking();
        
        const initialized = await tracker.initialize();
        if (!initialized) {
          setError('Failed to initialize MediaPipe face tracking');
          return;
        }

        // Get the video element from the tracker and connect it to our videoRef
        if (tracker.video && tracker.video.srcObject && videoRef.current) {
          const stream = tracker.video.srcObject;
          
          // Clone the stream tracks for the display video (required for desktop browsers)
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            const newStream = new MediaStream([videoTracks[0]]);
            videoRef.current.srcObject = newStream;
            
            // Ensure proper attributes for desktop browsers
            videoRef.current.autoplay = true;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            
            // Wait for video metadata to load
            await new Promise((resolve, reject) => {
              const onLoadedMetadata = () => {
                videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
                resolve();
              };
              videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
              
              // Timeout after 5 seconds
              setTimeout(() => {
                videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
                reject(new Error('Video metadata timeout'));
              }, 5000);
            });
            
            // Play the video
            try {
              await videoRef.current.play();
              console.log('[FaceTrackingTester] ✅ Video element connected and playing!');
              
              // Wait a bit for video to start and get dimensions
              await new Promise(resolve => setTimeout(resolve, 100));
              
              console.log('[FaceTrackingTester] Video state:', {
                readyState: videoRef.current.readyState,
                paused: videoRef.current.paused,
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                srcObject: !!videoRef.current.srcObject
              });
              
              if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                console.log('[FaceTrackingTester] ✅ Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
              } else {
                console.warn('[FaceTrackingTester] ⚠️ Video dimensions not available yet');
                // Try setting dimensions after another short delay
                setTimeout(() => {
                  if (videoRef.current.videoWidth > 0) {
                    console.log('[FaceTrackingTester] ✅ Video dimensions available:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                  }
                }, 500);
              }
            } catch (playError) {
              console.error('[FaceTrackingTester] Play error:', playError);
              setError(`Video play error: ${playError.message}`);
            }
          } else {
            console.error('[FaceTrackingTester] No video tracks in stream');
            setError('No video tracks available');
          }
        } else {
          console.error('[FaceTrackingTester] Tracker video or stream not available');
          console.log('tracker.video:', tracker.video);
          console.log('tracker.video?.srcObject:', tracker.video?.srcObject);
          console.log('videoRef.current:', videoRef.current);
          setError('Failed to connect video stream');
        }

        // Verify tracker's video is ready before starting
        if (tracker.video) {
          console.log('[FaceTrackingTester] Tracker video state:', {
            paused: tracker.video.paused,
            readyState: tracker.video.readyState,
            videoWidth: tracker.video.videoWidth,
            videoHeight: tracker.video.videoHeight,
            hasStream: !!tracker.video.srcObject
          });
          
          // Ensure tracker video is playing
          if (tracker.video.paused) {
            try {
              await tracker.video.play();
              console.log('[FaceTrackingTester] ✅ Tracker video now playing');
            } catch (e) {
              console.error('[FaceTrackingTester] Failed to play tracker video:', e);
            }
          }
        }

        // Setup callback for face detection
        tracker.onFaceDetected((faceData) => {
          console.log('[FaceTrackingTester] Face detected callback:', faceData);
          setTrackingData(faceData);
          drawTracking(faceData);
          
          if (onTrackingData) {
            onTrackingData(faceData);
          }
        });

        // Start tracking
        const started = await tracker.start();
        if (started) {
          faceTrackerRef.current = tracker;
          setIsTracking(true);
          console.log('[FaceTrackingTester] ✅ Face tracking started!');
          
          // Log detection status periodically
          setTimeout(() => {
            console.log('[FaceTrackingTester] Detection check:', {
              isRunning: tracker.isRunning,
              hasFaceMesh: !!tracker.faceMesh,
              hasVideo: !!tracker.video,
              videoPlaying: tracker.video && !tracker.video.paused
            });
          }, 1000);
        } else {
          setError('Failed to start face tracking');
          console.error('[FaceTrackingTester] Failed to start tracking');
        }

      } catch (err) {
        console.error('[FaceTrackingTester] Failed to start tracking:', err);
        setError(`Tracking error: ${err.message}`);
      }
    };

    // Small delay to ensure video element is mounted
    const timer = setTimeout(startTracking, 50);
    
    return () => {
      // Clear the start timer
      clearTimeout(timer);
      
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (faceTrackerRef.current) {
        faceTrackerRef.current.stop();
        faceTrackerRef.current = null;
      }
      
      // Stop video stream if present
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      console.log('[FaceTrackingTester] Cleanup complete');
    };
  }, [isVisible, onTrackingData]);

  const drawTracking = (data) => {
    const canvas = canvasRef.current;
    
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    
    // Note: Video is already drawn by the continuous drawLoop
    // This function only draws the tracking overlay
    
    // Draw face position visualization (yellow box like on mobile)
    if (data.detected && data.x !== undefined && data.y !== undefined) {
      const x = data.x * canvas.width;
      const y = data.y * canvas.height;
      
      // Calculate box size based on depth (z) or use a default
      // z is typically 0-1, where larger = closer = bigger box
      const baseSize = Math.min(canvas.width, canvas.height) * 0.2; // 20% of smaller dimension
      const depthMultiplier = data.z || 0.5;
      const size = baseSize * (0.5 + depthMultiplier);
      
      // Draw yellow bounding box (like mobile)
      ctx.strokeStyle = '#FFD700'; // Yellow/Gold
      ctx.lineWidth = 3;
      ctx.strokeRect(
        x - size, 
        y - size, 
        size * 2, 
        size * 2
      );
      
      // Draw center point
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Label with yellow text
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px sans-serif';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText('Face', x - size, y - size - 10);
      ctx.fillText('Face', x - size, y - size - 10);
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

  // Continuous drawing loop (draws video continuously)
  useEffect(() => {
    if (!isVisible) return;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const ctx = canvas.getContext('2d');
        
        // Set canvas size if needed
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        
        // Draw the current video frame (base layer)
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
          // Silently handle drawing errors
        }
        
        // Draw tracking overlay if we have data (OUTSIDE try-catch so errors show)
        if (trackingData) {
          drawTracking(trackingData);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(drawLoop);
    };

    animationFrameRef.current = requestAnimationFrame(drawLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, trackingData]);

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
          muted
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
