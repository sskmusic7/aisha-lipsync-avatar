import React, { useState, useEffect, useRef } from 'react';
import { LipsyncManager } from '@/core/LipsyncManager';
import { ThreeJSRenderer } from '@/renderers/threejs/ThreeJSRenderer';
import { BabylonJSRenderer } from '@/renderers/babylonjs/BabylonJSRenderer';
import { Canvas2DRenderer } from '@/renderers/canvas2d/Canvas2DRenderer';
import { RendererType, LipsyncState, LipsyncRenderer } from '@/core/types';
import { AudioControls } from './AudioControls';
import { RendererSwitcher } from './RendererSwitcher';
import { VisualizerPanel } from './VisualizerPanel';
import { InfoPanel } from './InfoPanel';
import './App.css';

const rendererMap = {
  [RendererType.THREEJS]: ThreeJSRenderer,
  [RendererType.BABYLONJS]: BabylonJSRenderer,
  [RendererType.CANVAS2D]: Canvas2DRenderer,
};

export const App: React.FC = () => {
  const [lipsyncManager] = useState(() => new LipsyncManager());
  const [currentRenderer, setCurrentRenderer] = useState<RendererType>(RendererType.THREEJS);
  const [lipsyncState, setLipsyncState] = useState<LipsyncState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const rendererContainerRef = useRef<HTMLDivElement>(null);
  const rendererInstanceRef = useRef<LipsyncRenderer | null>(null);

  // Initialize renderer
  useEffect(() => {
    const initRenderer = async () => {
      if (!rendererContainerRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // Dispose previous renderer
        if (rendererInstanceRef.current) {
          rendererInstanceRef.current.dispose();
        }

        // Create new renderer
        const RendererClass = rendererMap[currentRenderer];
        const renderer = new RendererClass();
        
        await renderer.init(rendererContainerRef.current);
        
        rendererInstanceRef.current = renderer;
        lipsyncManager.setRenderer(renderer);
        
      } catch (err) {
        setError(`Failed to initialize ${currentRenderer} renderer: ${err}`);
        console.error('Renderer initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initRenderer();
  }, [currentRenderer, lipsyncManager]);

  // Subscribe to lipsync state updates
  useEffect(() => {
    const unsubscribe = lipsyncManager.subscribe((state) => {
      setLipsyncState(state);
    });

    return unsubscribe;
  }, [lipsyncManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rendererInstanceRef.current) {
        rendererInstanceRef.current.dispose();
      }
      lipsyncManager.dispose();
    };
  }, [lipsyncManager]);

  const handleRendererChange = (renderer: RendererType) => {
    setCurrentRenderer(renderer);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🗣️ Multi-Framework Lipsync Demo</h1>
        <p>Real-time lip synchronization with Three.js, Babylon.js, and 2D Canvas</p>
      </header>

      <main className="app-main\">
        <div className="left-panel">
          <RendererSwitcher
            currentRenderer={currentRenderer}
            onRendererChange={handleRendererChange}
            disabled={isLoading}
          />
          
          <AudioControls
            lipsyncManager={lipsyncManager}
            disabled={isLoading}
          />
          
          {lipsyncState && (
            <VisualizerPanel state={lipsyncState} />
          )}
          
          <InfoPanel />
        </div>

        <div className="right-panel">
          <div className="renderer-container" ref={rendererContainerRef}>
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>Loading {currentRenderer} renderer...</p>
              </div>
            )}
            
            {error && (
              <div className="error-overlay">
                <h3>⚠️ Renderer Error</h3>
                <p>{error}</p>
                <button 
                  onClick={() => handleRendererChange(currentRenderer)}
                  className="retry-button"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
          
          {lipsyncState && (
            <div className="renderer-info">
              <span className="current-renderer">{currentRenderer.toUpperCase()}</span>
              <span className="current-viseme">
                {lipsyncState.viseme.replace('viseme_', '')}
              </span>
              <span className="volume-indicator">
                Vol: {(lipsyncState.features.volume * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
