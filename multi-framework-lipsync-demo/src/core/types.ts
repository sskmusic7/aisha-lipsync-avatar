import { VISEMES } from 'wawa-lipsync';

export interface LipsyncFeatures {
  bands: number[];
  deltaBands: number[];
  volume: number;
  centroid: number;
}

export interface LipsyncState {
  viseme: VISEMES;
  features: LipsyncFeatures;
  isPlaying: boolean;
  currentTime: number;
}

export interface AudioSource {
  element: HTMLAudioElement;
  name: string;
  duration: number;
}

export interface LipsyncRenderer {
  id: string;
  name: string;
  init(container: HTMLElement): Promise<void>;
  updateViseme(viseme: VISEMES, features: LipsyncFeatures): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface RendererConfig {
  smoothMovements: boolean;
  vowelSmoothing: number;
  consonantSmoothing: number;
  visualizerEnabled: boolean;
}

export enum RendererType {
  THREEJS = 'threejs',
  BABYLONJS = 'babylonjs',
  CANVAS2D = 'canvas2d'
}

