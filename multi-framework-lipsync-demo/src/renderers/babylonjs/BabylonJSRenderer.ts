import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, DirectionalLight, Color3, Mesh, MeshBuilder, StandardMaterial, Animation, AnimationGroup } from '@babylonjs/core';
import { VISEMES } from 'wawa-lipsync';
import { LipsyncRenderer, LipsyncFeatures } from '@/core/types';

export class BabylonJSRenderer implements LipsyncRenderer {
  public readonly id = 'babylonjs';
  public readonly name = 'Babylon.js';

  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: FreeCamera | null = null;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // Character components
  private character: Mesh | null = null;
  private head: Mesh | null = null;
  private mouth: Mesh | null = null;
  private leftEye: Mesh | null = null;
  private rightEye: Mesh | null = null;
  
  private animationGroup: AnimationGroup | null = null;

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    container.innerHTML = '';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    // Initialize Babylon.js
    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);

    this.setupScene();
    this.createSimpleCharacter();
    this.startRenderLoop();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private setupScene(): void {
    if (!this.scene) return;

    // Camera
    this.camera = new FreeCamera('camera1', new Vector3(0, 0, -3), this.scene);
    this.camera.setTarget(Vector3.Zero());

    // Lighting
    const hemisphericLight = new HemisphericLight('hemisphericLight', new Vector3(0, 1, 0), this.scene);
    hemisphericLight.intensity = 0.6;

    const directionalLight = new DirectionalLight('directionalLight', new Vector3(0, -1, 1), this.scene);
    directionalLight.intensity = 0.8;
    directionalLight.position = new Vector3(10, 10, -5);

    // Background
    this.scene.clearColor = new Color3(0.53, 0.81, 0.92).toColor4(); // Sky blue
  }

  private createSimpleCharacter(): void {
    if (!this.scene) return;

    // Head
    this.head = MeshBuilder.CreateSphere('head', { diameter: 1.6 }, this.scene);
    this.head.position.y = 0.2;

    const headMaterial = new StandardMaterial('headMaterial', this.scene);
    headMaterial.diffuseColor = new Color3(1, 0.86, 0.67); // Skin color
    this.head.material = headMaterial;

    // Eyes
    this.leftEye = MeshBuilder.CreateSphere('leftEye', { diameter: 0.16 }, this.scene);
    this.leftEye.position = new Vector3(-0.25, 0.5, 0.6);
    this.rightEye = MeshBuilder.CreateSphere('rightEye', { diameter: 0.16 }, this.scene);
    this.rightEye.position = new Vector3(0.25, 0.5, 0.6);

    const eyeMaterial = new StandardMaterial('eyeMaterial', this.scene);
    eyeMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    this.leftEye.material = eyeMaterial;
    this.rightEye.material = eyeMaterial;

    // Mouth
    this.mouth = MeshBuilder.CreateTorus('mouth', { diameter: 0.3, thickness: 0.05 }, this.scene);
    this.mouth.position = new Vector3(0, 0.1, 0.6);
    this.mouth.rotation.x = Math.PI / 2;

    const mouthMaterial = new StandardMaterial('mouthMaterial', this.scene);
    mouthMaterial.diffuseColor = new Color3(0.55, 0, 0); // Dark red
    this.mouth.material = mouthMaterial;

    // Group character parts
    this.character = MeshBuilder.CreateBox('character', { size: 0.01 }, this.scene);
    this.character.isVisible = false; // Invisible parent

    this.head.parent = this.character;
    this.leftEye.parent = this.character;
    this.rightEye.parent = this.character;
    this.mouth.parent = this.character;

    this.addIdleAnimation();
  }

  private addIdleAnimation(): void {
    if (!this.scene || !this.character) return;

    // Create breathing animation
    this.animationGroup = new AnimationGroup('idleAnimation', this.scene);

    // Breathing scale animation
    Animation.CreateAndStartAnimation(
      'breathe',
      this.character,
      'scaling.y',
      30,
      120,
      1,
      1.02,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    // Head rotation animation
    Animation.CreateAndStartAnimation(
      'headRotation',
      this.character,
      'rotation.y',
      30,
      240,
      0,
      0.2,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    // Blinking animation
    if (this.leftEye && this.rightEye) {
      Animation.CreateAndStartAnimation(
        'blink',
        this.leftEye,
        'scaling.y',
        30,
        30,
        1,
        0.1,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );

      Animation.CreateAndStartAnimation(
        'blink',
        this.rightEye,
        'scaling.y',
        30,
        30,
        1,
        0.1,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );
    }
  }

  updateViseme(viseme: VISEMES, features: LipsyncFeatures): void {
    if (!this.mouth) return;

    // Apply viseme animation


    // Get target scaling and position for mouth
    const targetScale = this.getVisemeScale(viseme, features);
    const targetRotation = this.getVisemeRotation(viseme);

    this.animateMouth(targetScale, targetRotation);
  }

  private getVisemeScale(viseme: VISEMES, features: LipsyncFeatures): Vector3 {
    const volume = Math.min(features.volume * 2, 1);

    switch (viseme) {
      case VISEMES.sil:
        return new Vector3(0.3, 0.3, 1);

      case VISEMES.aa: // "ah" sound - wide open
        return new Vector3(1.5 * (1 + volume), 1.2 * (1 + volume), 1);

      case VISEMES.E: // "eh" sound - medium wide
        return new Vector3(1.2 * (1 + volume), 0.8 * (1 + volume), 1);

      case VISEMES.I: // "ee" sound - narrow horizontal
        return new Vector3(1.1 * (1 + volume), 0.6 * (1 + volume), 1);

      case VISEMES.O: // "oh" sound - round
        return new Vector3(1.0 * (1 + volume), 1.0 * (1 + volume), 1);

      case VISEMES.U: // "oo" sound - small round
        return new Vector3(0.7 * (1 + volume), 0.7 * (1 + volume), 1);

      case VISEMES.PP: // P, B sounds - closed
        return new Vector3(0.4, 0.2, 1);

      case VISEMES.FF: // F, V sounds - slight opening
        return new Vector3(0.8 * (1 + volume), 0.4 * (1 + volume), 1);

      case VISEMES.SS: // S, Z sounds - narrow
        return new Vector3(0.9 * (1 + volume), 0.3 * (1 + volume), 1);

      case VISEMES.TH: // Th sounds
        return new Vector3(0.8 * (1 + volume), 0.5 * (1 + volume), 1);

      default:
        return new Vector3(0.8 * (1 + volume), 0.6 * (1 + volume), 1);
    }
  }

  private getVisemeRotation(viseme: VISEMES): Vector3 {
    switch (viseme) {
      case VISEMES.SS:
      case VISEMES.FF:
        return new Vector3(Math.PI / 2 + 0.2, 0, 0);
      default:
        return new Vector3(Math.PI / 2, 0, 0);
    }
  }

  private animateMouth(targetScale: Vector3, targetRotation: Vector3): void {
    if (!this.mouth || !this.scene) return;

    // Create smooth transition animation
    Animation.CreateAndStartAnimation(
      'mouthScale',
      this.mouth,
      'scaling',
      30,
      10,
      this.mouth.scaling.clone(),
      targetScale,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    Animation.CreateAndStartAnimation(
      'mouthRotation',
      this.mouth,
      'rotation',
      30,
      10,
      this.mouth.rotation.clone(),
      targetRotation,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
  }

  private startRenderLoop(): void {
    if (!this.engine) return;

    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.scene.render();
      }
    });
  }

  resize(_width: number, _height: number): void {
    if (this.engine) {
      this.engine.resize();
    }
  }

  private handleResize(): void {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.resize(width, height);
  }

  dispose(): void {
    if (this.animationGroup) {
      this.animationGroup.dispose();
    }

    if (this.scene) {
      this.scene.dispose();
    }

    if (this.engine) {
      this.engine.dispose();
    }

    if (this.container && this.canvas && this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }

    window.removeEventListener('resize', () => this.handleResize());
  }
}
