// Browser-based face tracking using MediaPipe.js
// Runs entirely in the browser - no backend needed!
import { FaceMesh } from '@mediapipe/face_mesh';

export class BrowserFaceTracking {
  constructor() {
    this.video = null;
    this.faceMesh = null;
    this.isInitialized = false;
    this.isRunning = false;
    this.currentPosition = { x: 0.5, y: 0.5, z: 0.5 };
    this.smoothFactor = 0.15;
    this.callbacks = [];
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('[BrowserFaceTracking] Initializing...');

      // Create video element (hidden)
      this.video = document.createElement('video');
      this.video.style.display = 'none';
      this.video.playsInline = true; // Important for mobile
      this.video.muted = true; // Required for autoplay
      document.body.appendChild(this.video);

      // Request webcam access with mobile-friendly constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' // Front camera
        }
      });

      this.video.srcObject = stream;
      await this.video.play();

      // Initialize MediaPipe Face Mesh using npm package
      // Use unpkg CDN which is more reliable for MediaPipe assets
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          // Use unpkg CDN for better reliability with MediaPipe assets
          // Unpkg serves the files exactly as they are in the npm package
          const baseUrl = `https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619`;
          const fileUrl = `${baseUrl}/${file}`;
          console.log('[BrowserFaceTracking] Loading MediaPipe file:', file, 'from:', fileUrl);
          return fileUrl;
        }
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Set up onResults callback
      this.faceMesh.onResults((results) => {
        this.handleFaceResults(results);
      });

      this.isInitialized = true;
      console.log('[BrowserFaceTracking] ✅ Initialized successfully!');
      return true;

    } catch (error) {
      console.error('[BrowserFaceTracking] Initialization failed:', error);
      return false;
    }
  }

  async start() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    this.isRunning = true;
    
    // Start detection loop (with error recovery built into detectFace)
    this.detectFace();
    return true;
  }

  handleFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected - only log occasionally to avoid spam
      if (Math.random() < 0.01) { // Log 1% of the time
        console.log('[BrowserFaceTracking] No face detected in frame');
      }
      this.notifyCallbacks({
        detected: false,
        confidence: 0.0
      });
      return;
    }

    console.log('[BrowserFaceTracking] ✅ Face detected! Landmarks:', results.multiFaceLandmarks[0].length);

    const landmarks = results.multiFaceLandmarks[0];
    
    // Get face bounding box from landmarks
    const xs = landmarks.map(l => l.x);
    const ys = landmarks.map(l => l.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Calculate center and size
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const faceSize = faceWidth * faceHeight;
    
    // Estimate depth from face size (larger = closer)
    const centerZ = Math.min(1.0, faceSize * 3);
    
    // Apply smoothing
    this.currentPosition.x += (centerX - this.currentPosition.x) * this.smoothFactor;
    this.currentPosition.y += (centerY - this.currentPosition.y) * this.smoothFactor;
    this.currentPosition.z += (centerZ - this.currentPosition.z) * this.smoothFactor;

    // Notify callbacks
    this.notifyCallbacks({
      x: this.currentPosition.x,
      y: this.currentPosition.y,
      z: this.currentPosition.z,
      detected: true,
      confidence: 0.9
    });
  }

  async detectFace() {
    if (!this.isRunning || !this.faceMesh || !this.video) {
      console.log('[BrowserFaceTracking] Detection stopped:', {
        isRunning: this.isRunning,
        hasFaceMesh: !!this.faceMesh,
        hasVideo: !!this.video
      });
      return;
    }

    // Check if video has valid frames
    if (this.video.readyState < 2 || this.video.videoWidth === 0) {
      // Continue loop even if video not ready yet
      if (this.isRunning) {
        setTimeout(() => this.detectFace(), 1000 / 30);
      }
      return;
    }

    try {
      // Send frame to FaceMesh - results will come via onResults callback
      await this.faceMesh.send({ image: this.video });

      // Continue detection loop (30 FPS)
      if (this.isRunning) {
        setTimeout(() => this.detectFace(), 1000 / 30);
      }

    } catch (error) {
      // Silently handle MediaPipe errors to prevent console spam
      // MediaPipe can throw errors during initialization or if assets are still loading
      if (error.message && error.message.includes('abort')) {
        // MediaPipe WASM error - might be temporary, retry after a short delay
        if (this.isRunning) {
          setTimeout(() => this.detectFace(), 1000 / 15); // Slower retry rate on error
        }
      } else {
        // Other errors - log occasionally but don't spam
        if (Math.random() < 0.1) { // Log 10% of errors
          console.warn('[BrowserFaceTracking] Detection error (retrying):', error.message || error);
        }
        // Continue loop
        if (this.isRunning) {
          setTimeout(() => this.detectFace(), 1000 / 30);
        }
      }
    }
  }

  stop() {
    this.isRunning = false;
    
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
    
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
  }

  onFaceDetected(callback) {
    this.callbacks.push(callback);
  }

  notifyCallbacks(faceData) {
    this.callbacks.forEach(callback => callback(faceData));
  }
}

