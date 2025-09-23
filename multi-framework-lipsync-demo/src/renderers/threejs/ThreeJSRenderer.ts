import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { OrbitControls } from 'three-stdlib';
import { VISEMES } from 'wawa-lipsync';
import { LipsyncRenderer, LipsyncFeatures } from '../../core/types';

export class ThreeJSRenderer implements LipsyncRenderer {
  public readonly id = 'threejs';
  public readonly name = 'Three.js';

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement | null = null;
  
  // Character components
  private character: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  
  // Animation
  private animationFrameId: number | null = null;
  private clock: THREE.Clock;
  private gltfLoader: GLTFLoader;
  
  // Controls
  private controls: OrbitControls | null = null;
  
  // Morph targets (if available)
  private morphTargets: { [key: string]: THREE.SkinnedMesh } = {};
  
  // Breathing animation
  private breathingIntensity = 0;
  private breathingSpeed = 1.5; // Breathing rate (cycles per second)
  private isBreathingEnabled = true;
  private isSpeaking = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.clock = new THREE.Clock();
    this.gltfLoader = new GLTFLoader();
  }

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    
    // Setup renderer - brighter background to see the character clearly
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0xf0f0f0, 1); // Light background instead of dark
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Setup camera - positioned to focus on the Ready Player Me avatar face
    this.camera.position.set(0, 0.2, 2); // Better angle to show face and some body
    this.camera.lookAt(0, 0.2, 0);
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();

    // Setup controls
    this.setupControls();

    // Setup scene
    this.setupLighting();
    await this.loadCharacter();
    this.startRenderLoop();

    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private setupControls(): void {
    if (!this.renderer.domElement) return;

    // Create orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // Configure controls
    this.controls.enableDamping = true; // Smooth movement
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    
    // Set target to look at Ready Player Me avatar's face level
    this.controls.target.set(0, 0.2, 0);
    
    // Zoom limits
    this.controls.minDistance = 0.5;   // Can zoom in close
    this.controls.maxDistance = 10;    // Can zoom out far
    
    // Rotation limits
    this.controls.maxPolarAngle = Math.PI; // Can rotate fully vertically
    this.controls.minPolarAngle = 0;
    
    // Pan limits (optional - uncomment if you want to restrict panning)
    // this.controls.enablePan = false;
    
    console.log('Orbit controls enabled: Left mouse = rotate, Right mouse = pan, Scroll = zoom');
  }

  private setupLighting(): void {
    // Bright ambient light so character is clearly visible
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    this.scene.add(ambientLight);

    // Main directional light - bright and clear
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Fill light for face illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-3, 5, 3);
    this.scene.add(fillLight);

    // Front light to eliminate dark areas on face
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
    frontLight.position.set(0, 2, 5);
    this.scene.add(frontLight);
  }

  private async loadCharacter(): Promise<void> {
    try {
      console.log('Loading Ready Player Me avatar...');
      
      // Try loading the wawalipavatar.glb first, then fallback to other avatars
      let avatarPath = '/assets/wawalipavatar.glb';
      let gltf;
      
      try {
        gltf = await this.loadGLTF(avatarPath);
      } catch (error) {
        console.log('wawalipavatar.glb not found, trying avatar.glb...');
        try {
          avatarPath = '/assets/avatar.glb';
          gltf = await this.loadGLTF(avatarPath);
        } catch (fallbackError) {
          console.log('avatar.glb not found, trying numbered GLB...');
          avatarPath = '/assets/68c39306f879ae3abafde63c.glb';
          gltf = await this.loadGLTF(avatarPath);
        }
      }
      
      this.character = gltf.scene;
      
      // Scale and position the Ready Player Me avatar
      this.character.scale.setScalar(1); // Ready Player Me avatars are usually correctly scaled
      this.character.position.set(0, -0.8, 0); // Better positioning to show head and upper body
      
      // Set up materials and find morph targets
      this.character.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Improve material lighting
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.needsUpdate = true;
            // Slight self-illumination for better visibility
            child.material.emissive = new THREE.Color(0x111111);
            child.material.roughness = 0.7;
            child.material.metalness = 0.1;
          }
          
          // Store morph target meshes for lipsync (Ready Player Me uses ARKit blend shapes)
          if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
            console.log('Found Ready Player Me morph targets:', Object.keys(child.morphTargetDictionary));
            this.morphTargets[child.name] = child;
            
            // Log specific mouth blend shapes
            const mouthShapes = Object.keys(child.morphTargetDictionary).filter(key => 
              key.toLowerCase().includes('mouth') || 
              key.toLowerCase().includes('jaw') ||
              key.toLowerCase().includes('lip')
            );
            console.log('Mouth blend shapes found:', mouthShapes);
          }
        }
      });

      this.scene.add(this.character);

      // Setup animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.character);
        
        // Play the first animation (usually idle)
        const action = this.mixer.clipAction(gltf.animations[0]);
        action.play();
        this.idleAction = action;
        
        console.log('Avatar animations loaded');
      }
      
      console.log('Ready Player Me avatar loaded successfully');
      
    } catch (error) {
      console.error('Failed to load Ready Player Me avatar:', error);
      // Fallback to simple geometry
      this.createFallbackCharacter();
    }
  }

  private loadGLTF(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve(gltf);
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  private createFallbackCharacter(): void {
    console.log('Creating fallback character...');
    
    this.character = new THREE.Group();
    
    // Create head - larger and more visible
    const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffdbac,
      shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.6, 0);
    head.castShadow = true;
    this.character.add(head);

    // Create body
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    this.character.add(body);

    // Create eyes - larger and more visible
    const eyeGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 1.7, 0.3);
    this.character.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 1.7, 0.3);
    this.character.add(rightEye);

    // Create mouth - larger and more visible
    const mouthGeometry = new THREE.RingGeometry(0.04, 0.08, 8);
    const mouthMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B0000,
      side: THREE.DoubleSide
    });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.5, 0.3);
    mouth.rotation.x = Math.PI / 2;
    this.character.add(mouth);

    // Store mouth reference for animation
    (this.character as any).mouth = mouth;

    this.scene.add(this.character);
  }

  updateViseme(viseme: VISEMES, features: LipsyncFeatures): void {
    // Apply viseme animation to morph targets or fallback mouth
    this.animateViseme(viseme, features);
  }

  private animateViseme(viseme: VISEMES, features: LipsyncFeatures): void {
    const volume = Math.min(features.volume * 2, 1);
    
    // Track speaking state for breathing animation
    this.isSpeaking = viseme !== VISEMES.sil || volume > 0.1;
    
    // Try to animate morph targets first
    if (Object.keys(this.morphTargets).length > 0) {
      this.animateMorphTargets(viseme, volume);
    } else if (this.character && (this.character as any).mouth) {
      // Fallback to simple mouth animation
      this.animateFallbackMouth(viseme, volume);
    }
  }

  private animateMorphTargets(viseme: VISEMES, volume: number): void {
    // Ready Player Me uses ARKit blend shapes, so we need to map our visemes to ARKit blend shapes
    const arkitMapping: { [key in VISEMES]: string[] } = {
      [VISEMES.sil]: [], // Silent - no mouth movement
      [VISEMES.aa]: ['mouthOpen', 'jawOpen'], // "ah" sound
      [VISEMES.E]: ['mouthOpen', 'mouthShrugLower'], // "eh" sound
      [VISEMES.I]: ['mouthSmile'], // "ih" sound - slight smile
      [VISEMES.O]: ['mouthPucker'], // "oh" sound - rounded mouth
      [VISEMES.U]: ['mouthPucker', 'mouthFunnel'], // "oo" sound - very rounded
      [VISEMES.PP]: ['mouthClose'], // P, B, M sounds - closed mouth
      [VISEMES.FF]: ['mouthLowerDownLeft', 'mouthLowerDownRight'], // F, V sounds
      [VISEMES.SS]: ['mouthShrugLower'], // S, Z sounds
      [VISEMES.TH]: ['mouthOpen'], // Th sounds
      [VISEMES.DD]: ['mouthOpen'], // D, T sounds
      [VISEMES.kk]: ['mouthOpen'], // K, G sounds
      [VISEMES.CH]: ['mouthPucker'], // Ch sounds
      [VISEMES.nn]: ['mouthClose'], // N sounds
      [VISEMES.RR]: ['mouthOpen'], // R sounds
    };

    // Reset all mouth-related morph targets
    Object.values(this.morphTargets).forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        // Only reset mouth-related blend shapes
        Object.keys(mesh.morphTargetDictionary).forEach(shapeName => {
          if (shapeName.toLowerCase().includes('mouth') || 
              shapeName.toLowerCase().includes('jaw') ||
              shapeName.toLowerCase().includes('lip')) {
            const index = mesh.morphTargetDictionary[shapeName];
            if (index !== undefined) {
              mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
                mesh.morphTargetInfluences[index], 
                0, 
                0.2
              );
            }
          }
        });
      }
    });

    // Apply current viseme using ARKit blend shapes
    const arkitShapes = arkitMapping[viseme] || [];
    
    Object.values(this.morphTargets).forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        arkitShapes.forEach(shapeName => {
          const index = mesh.morphTargetDictionary[shapeName];
          if (index !== undefined) {
            const targetValue = Math.min(volume * 1.2, 0.8); // Limit max intensity
            mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              mesh.morphTargetInfluences[index],
              targetValue,
              0.3
            );
          }
        });
      }
    });
  }

  private animateFallbackMouth(viseme: VISEMES, volume: number): void {
    const mouth = (this.character as any).mouth;
    if (!mouth) return;

    const targetScale = this.getVisemeScale(viseme, volume);
    
    // Smooth lerp animation
    mouth.scale.lerp(targetScale, 0.3);
  }

  private getVisemeScale(viseme: VISEMES, volume: number): THREE.Vector3 {
    const baseScale = 1 + volume * 0.5;
    
    switch (viseme) {
      case VISEMES.sil:
        return new THREE.Vector3(0.3, 0.3, 1);
      case VISEMES.aa:
        return new THREE.Vector3(1.2 * baseScale, 1.0 * baseScale, 1);
      case VISEMES.E:
        return new THREE.Vector3(1.0 * baseScale, 0.8 * baseScale, 1);
      case VISEMES.I:
        return new THREE.Vector3(0.8 * baseScale, 0.6 * baseScale, 1);
      case VISEMES.O:
        return new THREE.Vector3(0.9 * baseScale, 0.9 * baseScale, 1);
      case VISEMES.U:
        return new THREE.Vector3(0.6 * baseScale, 0.6 * baseScale, 1);
      case VISEMES.PP:
        return new THREE.Vector3(0.2 * baseScale, 0.2 * baseScale, 1);
      case VISEMES.FF:
        return new THREE.Vector3(0.8 * baseScale, 0.4 * baseScale, 1);
      case VISEMES.SS:
        return new THREE.Vector3(0.9 * baseScale, 0.3 * baseScale, 1);
      case VISEMES.TH:
        return new THREE.Vector3(0.8 * baseScale, 0.5 * baseScale, 1);
      default:
        return new THREE.Vector3(0.8 * baseScale, 0.6 * baseScale, 1);
    }
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      const delta = this.clock.getDelta();
      
      // Update controls (for smooth damping)
      if (this.controls) {
        this.controls.update();
      }
      
      // Update animation mixer
      if (this.mixer) {
        this.mixer.update(delta);
      }
      
      // Update breathing animation
      this.updateBreathing();
      
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private handleResize(): void {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateBreathing(): void {
    if (!this.isBreathingEnabled || !this.character) return;

    // Calculate breathing cycle based on time
    const time = this.clock.getElapsedTime();
    const breathingCycle = Math.sin(time * this.breathingSpeed * Math.PI * 2);
    
    // Create smooth breathing intensity (0 to 1)
    this.breathingIntensity = (breathingCycle + 1) / 2;

    // Apply breathing to Ready Player Me avatar
    Object.values(this.morphTargets).forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        // Only apply facial breathing when NOT speaking
        if (!this.isSpeaking) {
          const facialBreathingShapes = [
            'mouthDimpleLeft',
            'mouthDimpleRight', 
            'cheekPuff',
            'noseSneerLeft',
            'noseSneerRight'
          ];

          facialBreathingShapes.forEach(shapeName => {
            const index = mesh.morphTargetDictionary[shapeName];
            if (index !== undefined) {
              // Very subtle breathing effect
              const targetValue = this.breathingIntensity * 0.05; // 5% max intensity
              mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
                mesh.morphTargetInfluences[index] || 0,
                targetValue,
                0.1 // Smooth interpolation
              );
            }
          });
        }

        // Always apply body breathing (chest/shoulder movement)
        const bodyBreathingShapes = [
          'browDownLeft',
          'browDownRight',
          'browInnerUp'
        ];

        bodyBreathingShapes.forEach(shapeName => {
          const index = mesh.morphTargetDictionary[shapeName];
          if (index !== undefined) {
            // Very subtle body breathing
            const targetValue = this.breathingIntensity * 0.03; // 3% max intensity
            mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              mesh.morphTargetInfluences[index] || 0,
              targetValue,
              0.08
            );
          }
        });
      }
    });

    // Always add subtle body scale movement (chest breathing)
    if (this.character && this.character.scale) {
      const breathingScale = 1 + (this.breathingIntensity * 0.015); // 1.5% scale variation
      this.character.scale.y = THREE.MathUtils.lerp(
        this.character.scale.y,
        breathingScale,
        0.05
      );
    }
  }

  public setBreathingEnabled(enabled: boolean): void {
    this.isBreathingEnabled = enabled;
  }

  public setBreathingSpeed(speed: number): void {
    this.breathingSpeed = Math.max(0.1, Math.min(5, speed)); // Clamp between 0.1 and 5
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
    
    this.renderer.dispose();
    this.container = null;
  }
}