import { Lipsync, VISEMES } from 'wawa-lipsync';
import { LipsyncState, LipsyncFeatures, AudioSource, LipsyncRenderer, RendererConfig } from './types';

export class LipsyncManager {
  private lipsync: Lipsync;
  private audioElement: HTMLAudioElement | null = null;
  private animationFrameId: number | null = null;
  private renderer: LipsyncRenderer | null = null;
  private config: RendererConfig;
  private listeners: ((state: LipsyncState) => void)[] = [];

  constructor(config: Partial<RendererConfig> = {}) {
    this.lipsync = new Lipsync({
      fftSize: 2048,
      historySize: 10
    });

    this.config = {
      smoothMovements: true,
      vowelSmoothing: 0.2,
      consonantSmoothing: 0.4,
      visualizerEnabled: true,
      ...config
    };
  }

  // Audio Management
  async connectAudio(audioSource: HTMLAudioElement | string): Promise<AudioSource> {
    if (this.audioElement) {
      this.disconnectAudio();
    }

    if (typeof audioSource === 'string') {
      this.audioElement = new Audio(audioSource);
    } else {
      this.audioElement = audioSource;
    }

    // Wait for metadata to load
    await new Promise<void>((resolve, reject) => {
      if (!this.audioElement) return reject('No audio element');
      
      const onLoadedMetadata = () => {
        this.audioElement!.removeEventListener('loadedmetadata', onLoadedMetadata);
        resolve();
      };
      
      const onError = () => {
        this.audioElement!.removeEventListener('error', onError);
        reject('Failed to load audio');
      };

      this.audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
      this.audioElement.addEventListener('error', onError);

      if (this.audioElement.readyState >= 1) {
        resolve();
      }
    });

    this.lipsync.connectAudio(this.audioElement);
    
    // Start analysis automatically for connected audio
    this.startAnalysis();

    const sourceInfo: AudioSource = {
      element: this.audioElement,
      name: this.extractFileName(this.audioElement.src || 'Unknown'),
      duration: this.audioElement.duration || 0
    };

    return sourceInfo;
  }

  disconnectAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.stopAnalysis();
  }

  // Microphone Support
  async connectMicrophone(): Promise<MediaStreamAudioSourceNode> {
    try {
      const source = await this.lipsync.connectMicrophone();
      this.startAnalysis();
      return source;
    } catch (error) {
      console.error('Failed to connect microphone:', error);
      throw error;
    }
  }

  // Renderer Management
  setRenderer(renderer: LipsyncRenderer): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.renderer = renderer;
  }

  removeRenderer(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  // Analysis Control
  startAnalysis(): void {
    if (this.animationFrameId) return;

    const analyze = () => {
      this.lipsync.processAudio();
      
      const state: LipsyncState = {
        viseme: this.lipsync.viseme,
        features: this.lipsync.features as LipsyncFeatures,
        isPlaying: this.audioElement ? !this.audioElement.paused : false,
        currentTime: this.audioElement?.currentTime || 0
      };

      // Update renderer
      if (this.renderer && this.lipsync.features) {
        this.renderer.updateViseme(state.viseme, state.features);
      }

      // Notify listeners
      this.listeners.forEach(listener => listener(state));

      this.animationFrameId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  stopAnalysis(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Audio Playback Control
  async play(): Promise<void> {
    if (!this.audioElement) throw new Error('No audio connected');
    
    try {
      await this.audioElement.play();
      this.startAnalysis();
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopAnalysis();
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopAnalysis();
  }

  // Configuration
  updateConfig(newConfig: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RendererConfig {
    return { ...this.config };
  }

  // State Management
  subscribe(listener: (state: LipsyncState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Current State Getters
  get currentViseme(): VISEMES {
    return this.lipsync.viseme;
  }

  get currentFeatures(): LipsyncFeatures | null {
    return this.lipsync.features as LipsyncFeatures;
  }

  get isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  get currentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  get duration(): number {
    return this.audioElement?.duration || 0;
  }

  // Utilities
  private extractFileName(url: string): string {
    return url.split('/').pop()?.split('.')[0] || 'Unknown';
  }

  // Cleanup
  dispose(): void {
    this.stopAnalysis();
    this.disconnectAudio();
    this.removeRenderer();
    this.listeners = [];
  }
}
