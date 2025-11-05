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
      invertX: true,  // Invert horizontal (fix mirror effect)
      motionMode: config.motionMode || 'option1', // 'option1' = cascading (eyes→head→body), 'option2' = body-only, 'option3' = normalized algorithm
      ...config
    };

    this.faceTracker = new BrowserFaceTracking();
    this.bones = {};
    this.morphTargets = {};
    this.controller = null;
    this.isTracking = false;
    this.lastMovements = null; // Store movements to apply each frame
    this.lastFacePosition = null; // Store raw face position for option 2 body tracking
    
    // Calibration offsets (neutral position)
    this.calibrationOffset = { x: 0, y: 0 };
    
    // Don't call initialize() here - let the caller await it
  }
  
  // Calibrate - set current position as neutral/center
  calibrate() {
    if (this.lastMovements && this.lastMovements.head) {
      this.calibrationOffset = {
        x: this.lastMovements.head.x,
        y: this.lastMovements.head.y
      };
      console.log('[BrowserAvatarTracking] 🎯 Calibrated! Neutral position set to:', this.calibrationOffset);
    }
  }
  
  // Reset calibration to defaults
  resetCalibration() {
    this.calibrationOffset = { x: 0, y: 0 };
    console.log('[BrowserAvatarTracking] 🔄 Calibration reset to defaults');
  }

  // Recreate controller when motion mode changes
  recreateController() {
    if (this.config.motionMode === 'option3') {
      this.controller = new NormalizedFaceTrackerController();
    } else {
      this.controller = new AvatarMovementController();
    }
    console.log('[BrowserAvatarTracking] 🔄 Controller recreated for mode:', this.config.motionMode);
  }

  async initialize() {
    if (this.isTracking) {
      console.log('[BrowserAvatarTracking] Already initialized, skipping...');
      return true;
    }
    
    console.log('[BrowserAvatarTracking] Initializing browser-based eye tracking...');
    
    // Find and store bone references
    this.findBones();
    
    // Find morph targets for blinking
    this.findMorphTargets();
    
    // Initialize movement controller based on motion mode
    if (this.config.motionMode === 'option3') {
      this.controller = new NormalizedFaceTrackerController();
    } else {
      this.controller = new AvatarMovementController();
    }
    
    // Start face tracking
    const initialized = await this.faceTracker.initialize();
    
    if (initialized) {
      // Set up callback for face detection
      this.faceTracker.onFaceDetected((faceData) => {
        this.onFaceDetected(faceData);
      });
      
      // Start tracking
      await this.faceTracker.start();
      this.isTracking = true;
      console.log('[BrowserAvatarTracking] ✅ Eye tracking started successfully!');
      console.log('[BrowserAvatarTracking] Bones available:', Object.keys(this.bones));
      return true;
    } else {
      console.warn('[BrowserAvatarTracking] ⚠️ Could not start eye tracking. App will continue without it.');
      return false;
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
          // Ensure bone can be updated
          bone.matrixAutoUpdate = true;
          console.log(`[BrowserAvatarTracking] Found bone: ${key} -> ${name} (matrixAutoUpdate: ${bone.matrixAutoUpdate})`);
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
    // Swap left/right at the source (mirror X coordinate)
    const mirroredFaceData = {
      ...faceData,
      x: 1 - faceData.x // Mirror: left becomes right, right becomes left
    };

    // Store raw face position for option 2 body tracking
    this.lastFacePosition = mirroredFaceData;

    // Always calculate movements (even when face lost, to get smooth decay)
    const movements = this.controller.calculateMovements(mirroredFaceData);
    
    // Store movements to be applied in the render loop (always update for smooth decay)
    this.lastMovements = movements;
    
    // Debug: Log tracking data occasionally
    if (Math.random() < 0.02) { // Log ~2% of frames to avoid spam
      console.log('[BrowserAvatarTracking] Face detected:', {
        original: { x: faceData.x.toFixed(2), y: faceData.y.toFixed(2) },
        mirrored: { x: mirroredFaceData.x.toFixed(2), y: mirroredFaceData.y.toFixed(2) },
        movements: {
          head: { x: movements.head.x.toFixed(1), y: movements.head.y.toFixed(1) },
          eyes: { x: movements.eyes.x.toFixed(1), y: movements.eyes.y.toFixed(1) }
        }
      });
    }
  }
  
  // Get idle movements (smooth transition target when losing tracking)
  getIdleMovements() {
    // Return center/idle position for smooth transition
    return {
      body: { y: 0 },
      head: { x: 0, y: 0 },
      eyes: { x: 0, y: 0 }
    };
  }
  
  // Apply stored movements - call this from useFrame AFTER animations update
  applyTracking() {
    // Debug: Log occasionally to verify applyTracking is being called
    if (Math.random() < 0.01) { // Log 1% of frames
      console.log('[BrowserAvatarTracking] applyTracking called:', {
        hasLastMovements: !!this.lastMovements,
        lastMovements: this.lastMovements,
        hasCurrentRotations: !!this.currentRotations,
        bonesFound: Object.keys(this.bones || {})
      });
    }
    
    if (this.lastMovements) {
      this.updateAvatar(this.lastMovements);
    } else if (this.currentRotations) {
      // When tracking is lost, smoothly transition to center
      // Continue applying current rotations but they'll smoothly decay
      const decaySpeed = 0.15; // Smooth decay speed
      
      // Smoothly return all rotations to zero
      if (this.currentRotations.body) {
        this.currentRotations.body.y += (0 - this.currentRotations.body.y) * decaySpeed;
      }
      if (this.currentRotations.head) {
        this.currentRotations.head.x += (0 - this.currentRotations.head.x) * decaySpeed;
        this.currentRotations.head.y += (0 - this.currentRotations.head.y) * decaySpeed;
      }
      if (this.currentRotations.eyes) {
        this.currentRotations.eyes.x += (0 - this.currentRotations.eyes.x) * decaySpeed;
        this.currentRotations.eyes.y += (0 - this.currentRotations.eyes.y) * decaySpeed;
      }
      if (this.currentRotations.neck) {
        this.currentRotations.neck.x += (0 - this.currentRotations.neck.x) * decaySpeed;
        this.currentRotations.neck.y += (0 - this.currentRotations.neck.y) * decaySpeed;
      }
      if (this.currentRotations.spine) {
        this.currentRotations.spine.y += (0 - this.currentRotations.spine.y) * decaySpeed;
      }
      
      // Apply the decaying rotations
      this.updateAvatarFromCurrentRotations();
    }
  }

  updateAvatarFromCurrentRotations() {
    // Apply current rotations directly (for smooth decay when tracking lost)
    if (this.currentRotations.eyes) {
      this.updateEyesFromCurrent();
    }
    
    if (this.bones.head && this.currentRotations.head) {
      this.bones.head.rotation.x = this.currentRotations.head.y;
      this.bones.head.rotation.y = this.currentRotations.head.x;
    }
    
    if (this.bones.neck && this.currentRotations.neck) {
      this.bones.neck.rotation.x = this.currentRotations.neck.y;
      this.bones.neck.rotation.y = this.currentRotations.neck.x;
    }
    
    if (this.bones.body && this.currentRotations.body) {
      this.bones.body.rotation.y = this.currentRotations.body.y;
    }
    
    if (this.bones.spine && this.currentRotations.spine) {
      this.bones.spine.rotation.y = this.currentRotations.spine.y;
    }
  }

  updateAvatar(trackingData) {
    if (!trackingData) {
      console.warn('[BrowserAvatarTracking] updateAvatar called with no tracking data!');
      return;
    }

    const movementScale = this.config.reducedMovement ? 0.4 : 1.0;

    // Store current rotations for smooth transitions
    if (!this.currentRotations) {
      this.currentRotations = {
        body: { y: 0 },
        head: { x: 0, y: 0 },
        eyes: { x: 0, y: 0 }
      };
    }
    
    // Debug: Log occasionally to verify updateAvatar is working
    if (Math.random() < 0.01) { // Log 1% of frames
      console.log('[BrowserAvatarTracking] updateAvatar called:', {
        trackingData,
        bonesAvailable: Object.keys(this.bones || {}),
        movementScale,
        motionMode: this.config.motionMode
      });
    }

    // MOTION MODE OPTION 2: Eyes and head stay CENTERED, body turns naturally
    if (this.config.motionMode === 'option2') {
      // Eyes MUST stay CENTERED - locked to zero
      if (!this.currentRotations.eyes) {
        this.currentRotations.eyes = { x: 0, y: 0 };
      }
      // Force eyes to ZERO immediately (LOCKED - no movement)
      this.currentRotations.eyes.x = 0;
      this.currentRotations.eyes.y = 0;
      this.updateEyesFromCurrent();

      // Head MUST stay CENTERED (LOCKED - not turning with body)
      // If head is a child of body, we need to compensate for body rotation
      if (this.bones.head) {
        // Force head to ZERO in LOCAL space (compensates for parent body rotation)
        this.bones.head.rotation.x = 0;
        this.bones.head.rotation.y = 0;
        this.bones.head.rotation.z = 0;
        // Reset rotation state
        if (this.currentRotations.head) {
          this.currentRotations.head.x = 0;
          this.currentRotations.head.y = 0;
        }
        
        // If body is parent, compensate head rotation for body rotation
        // Head should stay forward in WORLD space, so counter-rotate in LOCAL space
        if (this.bones.body && this.currentRotations.body) {
          // Full compensation: if body rotates +10°, head rotates -10° in local space
          // This keeps head facing forward in world space
          this.bones.head.rotation.y = -this.currentRotations.body.y; // Full counter-rotation
        }
      }

      // Neck MUST stay CENTERED (LOCKED - not turning with body)
      if (this.bones.neck) {
        // Force neck to ZERO in LOCAL space
        this.bones.neck.rotation.x = 0;
        this.bones.neck.rotation.y = 0;
        this.bones.neck.rotation.z = 0;
        // Reset rotation state
        if (this.currentRotations.neck) {
          this.currentRotations.neck.x = 0;
          this.currentRotations.neck.y = 0;
        }
        
        // If body is parent, compensate neck rotation for body rotation
        // Neck should stay forward in WORLD space, so counter-rotate in LOCAL space
        if (this.bones.body && this.currentRotations.body) {
          // Full compensation for neck too
          this.bones.neck.rotation.y = -this.currentRotations.body.y * 0.9; // Strong counter-rotation
        }
      }

      // BODY follows naturally (organic, smooth movement - NOT robotic)
      // Use raw face position for body rotation (more reliable than trackingData.head)
      if (this.bones.body && this.lastFacePosition && this.lastFacePosition.detected) {
        // Use face X position directly (already mirrored in onFaceDetected)
        let faceX = this.lastFacePosition.x - 0.5; // Convert to -0.5 to 0.5 range
        faceX = faceX - (this.calibrationOffset.x * 0.5); // Apply calibration offset
        
        // Natural, organic body movement
        // Use smooth easing curve (ease-out cubic for natural deceleration)
        const maxBodyDegrees = 20; // Max 20 degrees - enough range but not excessive
        const normalizedX = faceX * 2; // Convert to -1 to 1 range
        const easedInput = normalizedX * (1 - Math.abs(normalizedX) * 0.3); // Ease-out curve
        const targetBodyY = this.degToRad(easedInput * movementScale * maxBodyDegrees);
        
        // Soft clamp (smooth falloff instead of hard limit)
        const maxBodyRad = this.degToRad(maxBodyDegrees);
        let clampedBodyY = Math.max(-maxBodyRad, Math.min(maxBodyRad, targetBodyY));
        
        // Apply soft edge smoothing (gentle resistance near limits)
        if (Math.abs(clampedBodyY) > maxBodyRad * 0.8) {
          const resistance = 0.85; // Slight resistance near edges
          clampedBodyY *= resistance;
        }
        
        if (!this.currentRotations.body) {
          this.currentRotations.body = { y: 0 };
        }
        
        // Natural, smooth body follow with momentum feel
        const bodyLerp = 0.6; // Slower = more natural momentum
        this.currentRotations.body.y += (clampedBodyY - this.currentRotations.body.y) * bodyLerp;
        this.bones.body.rotation.y = this.currentRotations.body.y;
        
        // Debug occasionally
        if (Math.random() < 0.01) {
          console.log('[BrowserAvatarTracking] Option 2 Body tracking:', {
            faceX: faceX.toFixed(3),
            normalizedX: normalizedX.toFixed(3),
            targetBodyDeg: (clampedBodyY * 180 / Math.PI).toFixed(1),
            currentBodyDeg: (this.currentRotations.body.y * 180 / Math.PI).toFixed(1)
          });
        }
      } else if (this.bones.body && trackingData.head) {
        // Fallback: use head position from movements
        let headX = trackingData.head.x - this.calibrationOffset.x;
        const maxBodyDegrees = 20;
        const easedInput = headX * (1 - Math.abs(headX) * 0.3);
        const targetBodyY = this.degToRad(easedInput * movementScale * maxBodyDegrees);
        const maxBodyRad = this.degToRad(maxBodyDegrees);
        let clampedBodyY = Math.max(-maxBodyRad, Math.min(maxBodyRad, targetBodyY));
        
        if (Math.abs(clampedBodyY) > maxBodyRad * 0.8) {
          clampedBodyY *= 0.85;
        }
        
        if (!this.currentRotations.body) {
          this.currentRotations.body = { y: 0 };
        }
        const bodyLerp = 0.6;
        this.currentRotations.body.y += (clampedBodyY - this.currentRotations.body.y) * bodyLerp;
        this.bones.body.rotation.y = this.currentRotations.body.y;
      } else if (this.bones.body && trackingData.body) {
        // Final fallback: use body data if available
        const maxBodyDegrees = 20;
        const easedInput = (trackingData.body.y || 0) * (1 - Math.abs(trackingData.body.y || 0) * 0.3);
        const targetBodyY = this.degToRad(easedInput * movementScale * maxBodyDegrees);
        const maxBodyRad = this.degToRad(maxBodyDegrees);
        let clampedBodyY = Math.max(-maxBodyRad, Math.min(maxBodyRad, targetBodyY));
        
        if (Math.abs(clampedBodyY) > maxBodyRad * 0.8) {
          clampedBodyY *= 0.85;
        }
        
        if (!this.currentRotations.body) {
          this.currentRotations.body = { y: 0 };
        }
        const bodyLerp = 0.6;
        this.currentRotations.body.y += (clampedBodyY - this.currentRotations.body.y) * bodyLerp;
        this.bones.body.rotation.y = this.currentRotations.body.y;
      } else if (this.bones.body) {
        // No tracking data - smoothly return body to center
        if (!this.currentRotations.body) {
          this.currentRotations.body = { y: 0 };
        }
        this.currentRotations.body.y *= 0.95; // Decay to center
        this.bones.body.rotation.y = this.currentRotations.body.y;
      }

      // Spine follows body naturally
      if (this.bones.spine) {
        if (!this.currentRotations.spine) {
          this.currentRotations.spine = { y: 0 };
        }
        // Spine follows body with natural lag
        const targetSpineY = this.currentRotations.body ? this.currentRotations.body.y * 0.4 : 0;
        this.currentRotations.spine.y += (targetSpineY - this.currentRotations.spine.y) * 0.65;
        this.bones.spine.rotation.y = this.currentRotations.spine.y;
      }

      return; // Early return for option2
    }

    // MOTION MODE OPTION 3: Normalized algorithm with deadzone and natural tracking
    if (this.config.motionMode === 'option3') {
      // Option 3 uses the controller's normalized algorithm directly
      // The controller already handles all the calculations
      // Just apply the rotations from trackingData
      
      // Apply head rotation (yaw and pitch)
      if (this.bones.head && trackingData.head) {
        if (!this.currentRotations.head) {
          this.currentRotations.head = { x: 0, y: 0 };
        }
        // trackingData.head already contains smoothed yaw/pitch in degrees
        const headYaw = this.degToRad(trackingData.head.x || 0);
        const headPitch = this.degToRad(trackingData.head.y || 0);
        this.bones.head.rotation.x = headPitch;
        this.bones.head.rotation.y = headYaw;
        // Store for reference
        this.currentRotations.head.x = headYaw;
        this.currentRotations.head.y = headPitch;
      }

      // Apply eye rotation (with offset for lead effect)
      if (trackingData.eyes) {
        if (!this.currentRotations.eyes) {
          this.currentRotations.eyes = { x: 0, y: 0 };
        }
        const eyeX = this.degToRad(trackingData.eyes.x || 0);
        const eyeY = this.degToRad(trackingData.eyes.y || 0);
        this.currentRotations.eyes.x = eyeX;
        this.currentRotations.eyes.y = eyeY;
        this.updateEyesFromCurrent();
      }

      // Apply body rotation (follows head with factor)
      if (this.bones.body && trackingData.body) {
        if (!this.currentRotations.body) {
          this.currentRotations.body = { y: 0 };
        }
        const bodyYaw = this.degToRad(trackingData.body.y || 0);
        this.currentRotations.body.y = bodyYaw;
        this.bones.body.rotation.y = bodyYaw;
      }

      // Spine follows body
      if (this.bones.spine && this.currentRotations.body) {
        if (!this.currentRotations.spine) {
          this.currentRotations.spine = { y: 0 };
        }
        const targetSpineY = this.currentRotations.body.y * 0.4;
        this.currentRotations.spine.y += (targetSpineY - this.currentRotations.spine.y) * 0.65;
        this.bones.spine.rotation.y = this.currentRotations.spine.y;
      }

      return; // Early return for option3
    }

    // MOTION MODE OPTION 1: Cascading movement (default - eyes→head→body)
    // Cascading delays: Eyes respond instantly, head follows (150ms), body follows (300ms)
    const eyeDelay = 0;      // Eyes: instant (0ms)
    const headDelay = 0.15;   // Head: 150ms delay
    const bodyDelay = 0.3;    // Body: 300ms delay
    
    // Smooth interpolation factor (higher = smoother but slower)
    const eyeLerp = 0.9;      // Eyes: fast response
    const headLerp = 0.85;    // Head: smooth follow
    const bodyLerp = 0.75;    // Body: subtle, delayed movement

    // Update eyes FIRST (instant response, no delay) - REALISTIC, SMALL INCREMENTS
    if (trackingData.eyes) {
      if (!this.currentRotations.eyes) {
        this.currentRotations.eyes = { x: 0, y: 0 };
      }
      
      // REDUCED: More realistic eye movement limits
      const maxEyeRotationDegrees = 15; // Max 15 degrees eye rotation
      const eyeMultiplier = 0.6; // Reduce sensitivity
      const targetEyeX = this.degToRad(trackingData.eyes.x * movementScale * maxEyeRotationDegrees * eyeMultiplier);
      const targetEyeY = this.degToRad(trackingData.eyes.y * movementScale * maxEyeRotationDegrees * eyeMultiplier);
      
      // Clamp to max rotation
      const maxEyeRad = this.degToRad(maxEyeRotationDegrees);
      const clampedEyeX = Math.max(-maxEyeRad, Math.min(maxEyeRad, targetEyeX));
      const clampedEyeY = Math.max(-maxEyeRad, Math.min(maxEyeRad, targetEyeY));
      
      // Smooth interpolation for eyes
      this.currentRotations.eyes.x += (clampedEyeX - this.currentRotations.eyes.x) * eyeLerp;
      this.currentRotations.eyes.y += (clampedEyeY - this.currentRotations.eyes.y) * eyeLerp;
      
      this.updateEyesFromCurrent();
    } else if (this.bones.leftEye || this.bones.rightEye) {
      // Initialize eyes to center if tracking data doesn't have eyes
      if (!this.currentRotations.eyes) {
        this.currentRotations.eyes = { x: 0, y: 0 };
      }
      this.updateEyesFromCurrent();
    }

    // Update head SECOND (150ms delay simulation via slower lerp) - REALISTIC, SMALL INCREMENTS
    if (this.bones.head && trackingData.head) {
      let headX = trackingData.head.x - this.calibrationOffset.x;
      let headY = trackingData.head.y - this.calibrationOffset.y;
      
      // REDUCED: 1.5 -> 0.8 for realistic small increments
      const maxHeadRotationDegrees = 12; // Max 12 degrees head rotation
      const targetHeadX = this.degToRad(headX * movementScale * maxHeadRotationDegrees * 0.8);
      const targetHeadY = this.degToRad(-headY * movementScale * maxHeadRotationDegrees * 0.8); // Negative Y for correct up/down
      
      // Clamp to max rotation
      const maxHeadRadX = this.degToRad(maxHeadRotationDegrees);
      const maxHeadRadY = this.degToRad(maxHeadRotationDegrees);
      const clampedHeadX = Math.max(-maxHeadRadX, Math.min(maxHeadRadX, targetHeadX));
      const clampedHeadY = Math.max(-maxHeadRadY, Math.min(maxHeadRadY, targetHeadY));
      
      // Smooth interpolation with delay effect
      this.currentRotations.head.x += (clampedHeadX - this.currentRotations.head.x) * headLerp;
      this.currentRotations.head.y += (clampedHeadY - this.currentRotations.head.y) * headLerp;
      
      this.bones.head.rotation.x = this.currentRotations.head.y;
      this.bones.head.rotation.y = this.currentRotations.head.x;
    }

    // Update neck to follow head (but even smoother)
    if (this.bones.neck && trackingData.head) {
      let neckX = trackingData.head.x - this.calibrationOffset.x;
      let neckY = trackingData.head.y - this.calibrationOffset.y;
      
      const targetNeckX = this.degToRad(neckX * 0.3 * movementScale);
      const targetNeckY = this.degToRad(-neckY * 0.3 * movementScale);
      
      if (!this.currentRotations.neck) {
        this.currentRotations.neck = { x: 0, y: 0 };
      }
      
      this.currentRotations.neck.x += (targetNeckX - this.currentRotations.neck.x) * headLerp;
      this.currentRotations.neck.y += (targetNeckY - this.currentRotations.neck.y) * headLerp;
      
      this.bones.neck.rotation.x = this.currentRotations.neck.y;
      this.bones.neck.rotation.y = this.currentRotations.neck.x;
    }

    // Update body LAST (300ms delay - only for larger movements) - REALISTIC, SMALL INCREMENTS
    if (this.bones.body && trackingData.body) {
      const maxBodyRotationDegrees = 8; // Max 8 degrees for realistic movement
      const targetBodyY = this.degToRad(trackingData.body.y * movementScale * maxBodyRotationDegrees * 0.15); // Subtle body rotation
      
      // Clamp to max rotation
      const maxBodyRad = this.degToRad(maxBodyRotationDegrees);
      const clampedBodyY = Math.max(-maxBodyRad, Math.min(maxBodyRad, targetBodyY));
      
      // Smooth interpolation with strongest delay effect
      this.currentRotations.body.y += (clampedBodyY - this.currentRotations.body.y) * bodyLerp;
      
      this.bones.body.rotation.y = this.currentRotations.body.y;
    }

    // Update spine to follow body
    if (this.bones.spine && trackingData.body) {
      const targetSpineY = this.degToRad(trackingData.body.y * 0.3 * movementScale);
      
      if (!this.currentRotations.spine) {
        this.currentRotations.spine = { y: 0 };
      }
      
      this.currentRotations.spine.y += (targetSpineY - this.currentRotations.spine.y) * bodyLerp;
      this.bones.spine.rotation.y = this.currentRotations.spine.y;
    }
  }

  updateEyesFromCurrent() {
    if (this.bones.leftEye) {
      this.bones.leftEye.rotation.x = this.currentRotations.eyes.y;
      this.bones.leftEye.rotation.y = this.currentRotations.eyes.x;
    }

    if (this.bones.rightEye) {
      this.bones.rightEye.rotation.x = this.currentRotations.eyes.y;
      this.bones.rightEye.rotation.y = this.currentRotations.eyes.x + this.degToRad(2);
    }
  }

  updateEyes(eyeData, movementScale = 1.0) {
    // Eyes are now updated via updateEyesFromCurrent() using currentRotations
    // This method is kept for compatibility but the actual update happens in updateAvatar
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
    // Smooth, quick transition back to center when losing tracking
    const returnSpeed = 0.12; // Higher = faster return (was 0.05, now 0.12 for quicker but still smooth)
    
    // Smoothly interpolate to zero
    this.bodyRotation.y += (0 - this.bodyRotation.y) * returnSpeed;
    this.headRotation.x += (0 - this.headRotation.x) * returnSpeed;
    this.headRotation.y += (0 - this.headRotation.y) * returnSpeed;
    this.eyeRotation.x += (0 - this.eyeRotation.x) * returnSpeed;
    this.eyeRotation.y += (0 - this.eyeRotation.y) * returnSpeed;

    return this.formatOutput();
  }

  onFaceLost() {
    // Called when face detection is lost - ensures smooth return happens
    // The returnToCenter() will be called automatically in calculateMovements
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

// Normalized Face Tracker Controller - Alternative algorithm with deadzone and natural tracking
class NormalizedFaceTrackerController {
  constructor() {
    // Key Parameters from algorithm
    this.maxHeadYaw = 55;      // 45-60° range (how far head turns horizontally)
    this.maxHeadPitch = 35;     // 30-40° range (how far head tilts up/down)
    this.maxBodyYaw = 25;       // 20-30° range (body rotation range)
    this.bodyFollowFactor = 0.4; // 0.3-0.5 (body follows 30-50% of head movement)
    this.smoothingFactor = 0.2;  // 0.15-0.25 (lower = smoother but more lag)
    this.deadzone = 0.05;        // Reduces micro-jitter in center
    
    // Eye gaze offset (eyes lead the head slightly)
    this.eyeOffsetX = 5;  // 5° additional rotation
    this.eyeOffsetY = 3;  // 3° additional rotation
    
    // Current smoothed values (in degrees)
    this.currentHeadYaw = 0;
    this.currentHeadPitch = 0;
    this.currentBodyYaw = 0;
    this.currentEyeX = 0;
    this.currentEyeY = 0;
    
    this.lastDetectionTime = performance.now();
  }

  lerp(current, target, factor) {
    return current + (target - current) * factor;
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

    // 1. Normalize face position to viewport space (-1 to 1)
    // faceData.x and faceData.y are already in 0-1 range, convert to -1 to 1
    let normX = (faceData.x - 0.5) * 2;  // Convert from 0-1 to -1 to 1
    let normY = (faceData.y - 0.5) * 2;
    
    // Apply deadzone in center (reduces micro-jitter)
    if (Math.abs(normX) < this.deadzone) {
      normX = 0;
    }
    if (Math.abs(normY) < this.deadzone) {
      normY = 0;
    }

    // 2. Calculate target head rotation angles
    const targetHeadYaw = normX * this.maxHeadYaw;      // Left/right rotation
    const targetHeadPitch = -normY * this.maxHeadPitch;  // Up/down rotation (negative for correct mapping)

    // 3. Calculate body rotation (more subtle, follows head)
    const targetBodyYaw = normX * this.maxBodyYaw * this.bodyFollowFactor;

    // 4. Calculate eye gaze (eyes lead the head slightly)
    // Eyes should be slightly ahead of head movement
    const eyeLeadFactor = 1.1; // Eyes move 10% more than head
    const targetEyeX = normX * this.maxHeadYaw * eyeLeadFactor;
    const targetEyeY = -normY * this.maxHeadPitch * eyeLeadFactor;

    // 5. Smooth the transitions using exponential smoothing
    this.currentHeadYaw = this.lerp(this.currentHeadYaw, targetHeadYaw, this.smoothingFactor);
    this.currentHeadPitch = this.lerp(this.currentHeadPitch, targetHeadPitch, this.smoothingFactor);
    this.currentBodyYaw = this.lerp(this.currentBodyYaw, targetBodyYaw, this.smoothingFactor);
    this.currentEyeX = this.lerp(this.currentEyeX, targetEyeX, this.smoothingFactor * 1.2); // Eyes slightly faster
    this.currentEyeY = this.lerp(this.currentEyeY, targetEyeY, this.smoothingFactor * 1.2);

    return this.formatOutput();
  }

  getIdleAnimation(currentTime) {
    const t = currentTime * 0.001;
    
    // Gentle idle animation
    return {
      body: { y: Math.sin(t * 0.1) * 3 },
      head: {
        x: Math.sin(t * 0.15) * 5,
        y: Math.cos(t * 0.2) * 3
      },
      eyes: {
        x: Math.sin(t * 0.3) * 8,
        y: Math.cos(t * 0.25) * 4
      }
    };
  }

  returnToCenter() {
    // Smooth, quick transition back to center when losing tracking
    const returnSpeed = 0.15;
    
    // Smoothly interpolate to zero
    this.currentHeadYaw = this.lerp(this.currentHeadYaw, 0, returnSpeed);
    this.currentHeadPitch = this.lerp(this.currentHeadPitch, 0, returnSpeed);
    this.currentBodyYaw = this.lerp(this.currentBodyYaw, 0, returnSpeed);
    this.currentEyeX = this.lerp(this.currentEyeX, 0, returnSpeed);
    this.currentEyeY = this.lerp(this.currentEyeY, 0, returnSpeed);

    return this.formatOutput();
  }

  formatOutput() {
    // Return in degrees (will be converted to radians in updateAvatar)
    return {
      body: { y: this.currentBodyYaw },
      head: {
        x: this.currentHeadYaw,
        y: this.currentHeadPitch
      },
      eyes: {
        x: this.currentEyeX,
        y: this.currentEyeY
      }
    };
  }
}

