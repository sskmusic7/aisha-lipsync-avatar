import React from 'react';

export const InfoPanel: React.FC = () => {
  return (
    <div className="info-panel\">
      <h3>ℹ️ About This Demo</h3>
      
      <div className="info-section\">
        <h4>🎯 Features</h4>
        <ul>
          <li><strong>Multi-Framework:</strong> Three.js, Babylon.js, 2D Canvas</li>
          <li><strong>Real-time Analysis:</strong> Live audio processing</li>
          <li><strong>Viseme Detection:</strong> 15 mouth shapes</li>
          <li><strong>Audio Sources:</strong> Files, microphone, samples</li>
          <li><strong>Visual Feedback:</strong> Frequency visualization</li>
        </ul>
      </div>

      <div className="info-section\">
        <h4>🔊 How It Works</h4>
        <p>
          This demo uses the <strong>Wawa Lipsync</strong> library to analyze audio 
          in real-time and detect speech visemes (mouth shapes). The audio is 
          processed using the Web Audio API, which extracts frequency bands and 
          calculates features like volume and spectral centroid.
        </p>
      </div>

      <div className="info-section\">
        <h4>🎮 Renderers</h4>
        <div className="renderer-info\">
          <div className="renderer-item\">
            <strong>Three.js:</strong> 3D WebGL rendering with lighting and animations
          </div>
          <div className="renderer-item\">
            <strong>Babylon.js:</strong> Advanced 3D engine with PBR materials
          </div>
          <div className="renderer-item\">
            <strong>2D Canvas:</strong> Lightweight 2D character animation
          </div>
        </div>
      </div>

      <div className="info-section\">
        <h4>🗣️ Visemes</h4>
        <p>
          Visemes are visual representations of phonemes (speech sounds). 
          This demo detects 15 different visemes based on the Oculus LipSync standard:
        </p>
        <div className="viseme-grid\">
          <span className="viseme-tag\">sil</span>
          <span className="viseme-tag\">PP</span>
          <span className="viseme-tag\">FF</span>
          <span className="viseme-tag\">TH</span>
          <span className="viseme-tag\">DD</span>
          <span className="viseme-tag\">kk</span>
          <span className="viseme-tag\">CH</span>
          <span className="viseme-tag\">SS</span>
          <span className="viseme-tag\">nn</span>
          <span className="viseme-tag\">RR</span>
          <span className="viseme-tag\">aa</span>
          <span className="viseme-tag\">E</span>
          <span className="viseme-tag\">I</span>
          <span className="viseme-tag\">O</span>
          <span className="viseme-tag\">U</span>
        </div>
      </div>

      <div className="info-section\">
        <h4>💡 Tips</h4>
        <ul>
          <li>Try different audio sources to see how detection varies</li>
          <li>Use the microphone for real-time speech analysis</li>
          <li>Switch between renderers to compare performance</li>
          <li>Watch the frequency visualization for audio insights</li>
          <li>Clear speech with good microphone quality works best</li>
        </ul>
      </div>

      <div className="info-section\">
        <h4>🔗 Resources</h4>
        <div className="links\">
          <a href="https://github.com/wass08/wawa-lipsync\" target="_blank\" rel="noopener noreferrer\">
            📦 Wawa Lipsync Library
          </a>
          <a href="https://threejs.org/\" target="_blank\" rel="noopener noreferrer\">
            🎮 Three.js
          </a>
          <a href="https://babylonjs.com/\" target="_blank\" rel="noopener noreferrer\">
            🏛️ Babylon.js
          </a>
        </div>
      </div>
    </div>
  );
};
