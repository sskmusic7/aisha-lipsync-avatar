// Browser-based face tracking using MediaPipe.js
// Runs entirely in the browser - no backend needed!

export class BrowserFaceTracking {
  constructor() {
    this.video = null;
    this.faceLandmarker = null;
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

      // Wait for MediaPipe to be loaded
      if (!window.FaceLandmarker) {
        console.error('[BrowserFaceTracking] MediaPipe not loaded. Make sure to include the script in index.html');
        return false;
      }

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

      // Initialize MediaPipe Face Landmarker
      const { FaceLandmarker, FilesetResolver } = window;
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
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
    this.detectFace();
    return true;
  }

  async detectFace() {
    if (!this.isRunning || !this.faceLandmarker || !this.video) return;

    try {
      const results = await this.faceLandmarker.detectForVideo(this.video, performance.now());

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        
        // Get nose tip (landmark 1) for face center
        const nose = landmarks[1];
        
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
      } else {
        // No face detected
        this.notifyCallbacks({
          detected: false,
          confidence: 0.0
        });
      }

      // Continue detection loop (30 FPS)
      if (this.isRunning) {
        setTimeout(() => this.detectFace(), 1000 / 30);
      }

    } catch (error) {
      console.error('[BrowserFaceTracking] Detection error:', error);
      if (this.isRunning) {
        setTimeout(() => this.detectFace(), 1000 / 30);
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

