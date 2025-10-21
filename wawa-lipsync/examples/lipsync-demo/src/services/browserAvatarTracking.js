// Browser-based avatar tracking - No backend needed!
// Uses MediaPipe.js directly in the browser
import * as THREE from 'three';
import { BrowserFaceTracking } from './browserFaceTracking';

export class BrowserAvatarTracking {
  constructor(avatarScene, config = {}) {
    this.avatar = avatarScene;
    this.config = {
      enableBlinking: config.enableBlinking !== false,
      enableMicroMovements: config.enableMicroMovements !== false,
      reducedMovement: false,
      ...config
    };

    this.faceTracker = new BrowserFaceTracking();
    this.bones = {};
    this.morphTargets = {};
    this.controller = null;
    this.isTracking = false;

    this.initialize();
  }

  async initialize() {
    console.log('[BrowserAvatarTracking] Initializing browser-based eye tracking...');
    
    // Find and store bone references
    this.findBones();
    
    // Find morph targets for blinking
    this.findMorphTargets();
    
    // Initialize movement controller
    this.controller = new AvatarMovementController();
    
    // Start face tracking
    const initialized = await this.faceTracker.initialize();
    
    if (initialized) {
      // Set up callback for face detection
      this.faceTracker.onFaceDetected((faceData) => {
        this.onFaceDetected(faceData);
      });
      
      // Start tracking
      await this.faceTracker.start();
      console.log('[BrowserAvatarTracking] ✅ Eye tracking started successfully!');
    } else {
      console.warn('[BrowserAvatarTracking] ⚠️ Could not start eye tracking. App will continue without it.');
    }
  }

  findBones() {
    const boneNames = {
      body: ['Hips', 'mixamorigHips', 'hips'],
      spine: ['Spine', 'mixamorigSpine', 'spine'],
      head: ['Head', 'mixamorigHead', 'head'],
      neck: ['Neck', 'mixamorigNeck', 'neck'],
      leftEye: ['LeftEye', 'mixamorigLeftEye', 'left_eye', 'leftEye'],
      rightEye: ['RightEye', 'mixamorigRightEye', 'right_eye', 'rightEye']
    };

    for (const [key, names] of Object.entries(boneNames)) {
      for (const name of names) {
        const bone = this.avatar.getObjectByName(name);
        if (bone) {
          this.bones[key] = bone;
          console.log(`[BrowserAvatarTracking] Found bone: ${key} -> ${name}`);
          break;
        }
      }
    }

    console.log('[BrowserAvatarTracking] Bones found:', Object.keys(this.bones));
  }

  findMorphTargets() {
    this.avatar.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        this.morphTargets = {
          mesh: child,
          dictionary: child.morphTargetDictionary,
          influences: child.morphTargetInfluences
        };
        console.log('[BrowserAvatarTracking] Found morph targets:', Object.keys(child.morphTargetDictionary));
      }
    });
  }

  onFaceDetected(faceData) {
    if (!faceData.detected) {
      // Use idle animation when no face detected
      this.applyIdleAnimation();
      return;
    }

    // Calculate movements from face position
    const movements = this.controller.calculateMovements(faceData);
    
    // Apply movements to avatar
    this.updateAvatar(movements);
  }

  updateAvatar(trackingData) {
    if (!trackingData) return;

    const movementScale = this.config.reducedMovement ? 0.4 : 1.0;

    // Update body rotation
    if (this.bones.body && trackingData.body) {
      this.bones.body.rotation.y = this.degToRad(trackingData.body.y * movementScale);
    }

    // Update spine for more natural movement
    if (this.bones.spine && trackingData.body) {
      this.bones.spine.rotation.y = this.degToRad(trackingData.body.y * 0.3 * movementScale);
    }

    // Update head rotation
    if (this.bones.head && trackingData.head) {
      this.bones.head.rotation.x = this.degToRad(trackingData.head.y * movementScale);
      this.bones.head.rotation.y = this.degToRad(trackingData.head.x * movementScale);
    }

    // Update neck for smoother transition
    if (this.bones.neck && trackingData.head) {
      this.bones.neck.rotation.x = this.degToRad(trackingData.head.y * 0.3 * movementScale);
      this.bones.neck.rotation.y = this.degToRad(trackingData.head.x * 0.3 * movementScale);
    }

    // Update eye rotation
    if (trackingData.eyes) {
      this.updateEyes(trackingData.eyes, movementScale);
    }
  }

  updateEyes(eyeData, movementScale = 1.0) {
    if (!eyeData) return;

    const eyeX = this.degToRad(eyeData.x * movementScale);
    const eyeY = this.degToRad(eyeData.y * movementScale);

    if (this.bones.leftEye) {
      this.bones.leftEye.rotation.x = eyeY;
      this.bones.leftEye.rotation.y = eyeX;
    }

    if (this.bones.rightEye) {
      this.bones.rightEye.rotation.x = eyeY;
      this.bones.rightEye.rotation.y = eyeX + this.degToRad(2);
    }
  }

  applyIdleAnimation() {
    const t = performance.now() * 0.001;
    
    const idleMovements = {
      body: { y: Math.sin(t * 0.1) * 5 },
      head: {
        x: Math.sin(t * 0.15) * 8,
        y: Math.cos(t * 0.2) * 5
      },
      eyes: {
        x: Math.sin(t * 0.3) * 10,
        y: Math.cos(t * 0.25) * 5
      }
    };

    this.updateAvatar(idleMovements);
  }

  degToRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  onLipsyncStart() {
    this.config.reducedMovement = true;
  }

  onLipsyncEnd() {
    this.config.reducedMovement = false;
  }

  disconnect() {
    this.isRunning = false;
    if (this.faceTracker) {
      this.faceTracker.stop();
    }
  }
}

// Avatar movement controller (same logic as Python backend)
class AvatarMovementController {
  constructor() {
    this.bodyRotation = { y: 0 };
    this.headRotation = { x: 0, y: 0 };
    this.eyeRotation = { x: 0, y: 0 };
    
    this.limits = {
      body: { y: 45 },
      head: { x: 30, y: 25 },
      eye: { x: 20, y: 15 }
    };
    
    this.smoothing = {
      body: 0.08,
      head: 0.12,
      eye: 0.25
    };
    
    this.lastDetectionTime = performance.now();
  }

  calculateMovements(faceData) {
    const currentTime = performance.now();

    if (!faceData.detected) {
      if (currentTime - this.lastDetectionTime > 2000) {
        return this.getIdleAnimation(currentTime);
      }
      return this.returnToCenter();
    }

    this.lastDetectionTime = currentTime;

    // Convert normalized coordinates to centered coordinates (-1 to 1)
    const normX = (faceData.x - 0.5) * 2;
    const normY = (faceData.y - 0.5) * 2;
    const normZ = faceData.z || 0.5;

    // Calculate target rotations
    const targets = this.calculateTargetRotations(normX, normY, normZ);
    
    // Apply smoothing
    this.applySmoothing(targets);
    
    // Add micro-movements
    this.addMicroMovements(currentTime);

    return this.formatOutput();
  }

  calculateTargetRotations(x, y, z) {
    const targets = {};

    // Body rotation (only horizontal, activates when face near edges)
    if (Math.abs(x) > 0.3) {
      targets.body_y = x * this.limits.body.y;
    } else {
      targets.body_y = 0;
    }

    // Head rotation
    targets.head_x = x * this.limits.head.x;
    targets.head_y = -y * this.limits.head.y;

    // Eye rotation
    targets.eye_x = x * this.limits.eye.x * 1.5;
    targets.eye_y = -y * this.limits.eye.y * 1.5;

    // Adjust for distance
    const distanceFactor = 1.0 + (0.5 - z) * 0.3;
    for (const key in targets) {
      targets[key] *= distanceFactor;
    }

    return targets;
  }

  applySmoothing(targets) {
    if (targets.body_y !== undefined) {
      this.bodyRotation.y += (targets.body_y - this.bodyRotation.y) * this.smoothing.body;
    }

    if (targets.head_x !== undefined) {
      this.headRotation.x += (targets.head_x - this.headRotation.x) * this.smoothing.head;
    }
    if (targets.head_y !== undefined) {
      this.headRotation.y += (targets.head_y - this.headRotation.y) * this.smoothing.head;
    }

    if (targets.eye_x !== undefined) {
      this.eyeRotation.x += (targets.eye_x - this.eyeRotation.x) * this.smoothing.eye;
    }
    if (targets.eye_y !== undefined) {
      this.eyeRotation.y += (targets.eye_y - this.eyeRotation.y) * this.smoothing.eye;
    }
  }

  addMicroMovements(currentTime) {
    const t = currentTime * 0.001;
    const breathing = Math.sin(t * 0.3) * 0.5;
    this.headRotation.y += breathing;

    const eyeDriftX = Math.sin(t * 1.7) * 0.3;
    const eyeDriftY = Math.cos(t * 2.1) * 0.2;
    this.eyeRotation.x += eyeDriftX;
    this.eyeRotation.y += eyeDriftY;
  }

  getIdleAnimation(currentTime) {
    const t = currentTime * 0.001;
    
    return {
      body: { y: Math.sin(t * 0.1) * 5 },
      head: {
        x: Math.sin(t * 0.15) * 8,
        y: Math.cos(t * 0.2) * 5
      },
      eyes: {
        x: Math.sin(t * 0.3) * 10,
        y: Math.cos(t * 0.25) * 5
      }
    };
  }

  returnToCenter() {
    const decay = 0.05;
    
    this.bodyRotation.y *= (1 - decay);
    this.headRotation.x *= (1 - decay);
    this.headRotation.y *= (1 - decay);
    this.eyeRotation.x *= (1 - decay);
    this.eyeRotation.y *= (1 - decay);

    return this.formatOutput();
  }

  formatOutput() {
    return {
      body: { y: this.bodyRotation.y },
      head: {
        x: this.headRotation.x - this.bodyRotation.y * 0.3,
        y: this.headRotation.y
      },
      eyes: {
        x: this.eyeRotation.x - this.headRotation.x * 0.5,
        y: this.eyeRotation.y - this.headRotation.y * 0.5
      }
    };
  }
}

