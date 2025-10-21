// avatarTracking.js - Eye tracking and body following for Aisha avatar
import * as THREE from 'three';

export class AvatarTracking {
  constructor(avatarScene, config = {}) {
    this.avatar = avatarScene;
    this.config = {
      wsUrl: config.wsUrl || 'wss://aisha-eye-tracking-backend.onrender.com/ws',
      enableBlinking: config.enableBlinking !== false,
      enableMicroMovements: config.enableMicroMovements !== false,
      reducedMovement: false,
      ...config
    };

    this.ws = null;
    this.isConnected = false;
    this.bones = {};
    this.morphTargets = {};
    this.isTracking = false;

    this.initialize();
  }

  initialize() {
    // Find and store bone references
    this.findBones();
    
    // Find morph targets for blinking
    this.findMorphTargets();
    
    // Connect to WebSocket
    this.connectWebSocket();
  }

  findBones() {
    // Standard Ready Player Me and mixamo bone names
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
          console.log(`[AvatarTracking] Found bone: ${key} -> ${name}`);
          break;
        }
      }
    }

    console.log('[AvatarTracking] Bones found:', Object.keys(this.bones));
  }

  findMorphTargets() {
    // Find mesh with morph targets for blinking
    this.avatar.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        this.morphTargets = {
          mesh: child,
          dictionary: child.morphTargetDictionary,
          influences: child.morphTargetInfluences
        };
        console.log('[AvatarTracking] Found morph targets:', Object.keys(child.morphTargetDictionary));
      }
    });
  }

  connectWebSocket() {
    console.log('[AvatarTracking] Connecting to tracking server...');
    
    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        console.log('[AvatarTracking] Connected to tracking server');
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.updateAvatar(data);
        } catch (error) {
          console.error('[AvatarTracking] Error parsing tracking data:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('[AvatarTracking] WebSocket error - Eye tracking unavailable. App will continue without it.');
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        console.log('[AvatarTracking] Disconnected from tracking server - App continues without eye tracking');
        this.isConnected = false;
        
        // Don't auto-reconnect - fail gracefully
        // User can refresh page if they want to try again
      };
    } catch (error) {
      console.error('[AvatarTracking] Failed to create WebSocket:', error);
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          this.connectWebSocket();
        }
      }, 5000);
    }
  }

  updateAvatar(trackingData) {
    if (!trackingData) return;

    this.isTracking = true;

    // Apply movement reduction during speech if configured
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

    // Handle blinking (only if not controlled by lipsync)
    if (trackingData.blink && this.config.enableBlinking) {
      this.blink();
    }
  }

  updateEyes(eyeData, movementScale = 1.0) {
    if (!eyeData) return;

    const eyeX = this.degToRad(eyeData.x * movementScale);
    const eyeY = this.degToRad(eyeData.y * movementScale);

    // Update eye bones if available
    if (this.bones.leftEye) {
      this.bones.leftEye.rotation.x = eyeY;
      this.bones.leftEye.rotation.y = eyeX;
    }

    if (this.bones.rightEye) {
      this.bones.rightEye.rotation.x = eyeY;
      this.bones.rightEye.rotation.y = eyeX + this.degToRad(2); // Slight offset for realism
    }
  }

  blink() {
    if (!this.morphTargets.dictionary) return;

    // Common morph target names for blinking
    const blinkTargets = [
      'eyesClosed',
      'eyesClosedLeft',
      'eyesClosedRight',
      'blink',
      'Blink_Left',
      'Blink_Right',
      'eyeBlinkLeft',
      'eyeBlinkRight'
    ];

    const targetIndices = [];
    for (const target of blinkTargets) {
      if (this.morphTargets.dictionary[target] !== undefined) {
        targetIndices.push(this.morphTargets.dictionary[target]);
      }
    }

    if (targetIndices.length === 0) return;

    // Close eyes
    targetIndices.forEach(index => {
      this.morphTargets.influences[index] = 1;
    });

    // Open eyes after 150ms
    setTimeout(() => {
      targetIndices.forEach(index => {
        this.morphTargets.influences[index] = 0;
      });
    }, 150);
  }

  degToRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  // Call this when lipsync starts
  onLipsyncStart() {
    this.config.reducedMovement = true;
  }

  // Call this when lipsync ends
  onLipsyncEnd() {
    this.config.reducedMovement = false;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  // Update method to be called in animation loop if needed
  update(deltaTime) {
    // Tracking updates automatically via WebSocket
    // This method can be used for future enhancements
  }
}

