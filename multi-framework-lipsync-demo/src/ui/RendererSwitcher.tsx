import React from 'react';
import { RendererType } from '@/core/types';

interface RendererSwitcherProps {
  currentRenderer: RendererType;
  onRendererChange: (renderer: RendererType) => void;
  disabled?: boolean;
}

const rendererInfo = {
  [RendererType.THREEJS]: {
    name: 'Three.js',
    description: '3D WebGL rendering with Three.js',
    icon: '🎮',
    features: ['WebGL', '3D Models', 'Lighting', 'Animations']
  },
  [RendererType.BABYLONJS]: {
    name: 'Babylon.js',
    description: '3D WebGL rendering with Babylon.js',
    icon: '🏛️',
    features: ['WebGL', 'PBR Materials', 'Physics', 'Audio']
  },
  [RendererType.CANVAS2D]: {
    name: '2D Canvas',
    description: '2D rendering with HTML5 Canvas',
    icon: '🎨',
    features: ['2D Graphics', 'Lightweight', 'Custom Animations', 'Debugging']
  }
};

export const RendererSwitcher: React.FC<RendererSwitcherProps> = ({
  currentRenderer,
  onRendererChange,
  disabled = false
}) => {
  return (
    <div className="renderer-switcher\">
      <h3>🔧 Choose Renderer</h3>
      
      <div className="renderer-options\">
        {Object.entries(rendererInfo).map(([key, info]) => {
          const rendererType = key as RendererType;
          const isActive = currentRenderer === rendererType;
          
          return (
            <button
              key={key}
              className={`renderer-option ${isActive ? 'active' : ''}`}
              onClick={() => onRendererChange(rendererType)}
              disabled={disabled}
            >
              <div className="renderer-header\">
                <span className="renderer-icon\">{info.icon}</span>
                <span className="renderer-name\">{info.name}</span>
              </div>
              
              <p className="renderer-description\">{info.description}</p>
              
              <div className="renderer-features\">
                {info.features.map((feature) => (
                  <span key={feature} className="feature-tag\">
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
