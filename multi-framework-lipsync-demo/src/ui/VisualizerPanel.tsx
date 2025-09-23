import React, { useRef, useEffect } from 'react';
import { LipsyncState } from '@/core/types';
import { VISEMES } from 'wawa-lipsync';

interface VisualizerPanelProps {
  state: LipsyncState;
}

export const VisualizerPanel: React.FC<VisualizerPanelProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !state.features) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    drawVisualization(ctx, canvas.width, canvas.height, state);
  }, [state]);

  const drawVisualization = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: LipsyncState
  ) => {
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const { features } = state;
    const padding = 40;
    const barWidth = (width - padding * 2) / features.bands.length;
    const maxHeight = height - padding * 2;

    // Draw frequency bands
    features.bands.forEach((energy, i) => {
      const barHeight = energy * maxHeight;
      const x = padding + i * barWidth;
      const y = height - padding - barHeight;

      // Color based on frequency band
      const hue = (i / features.bands.length) * 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Band labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`B${i + 1}`, x + barWidth / 2, height - 5);
    });

    // Draw centroid line
    const centroidX = padding + (features.centroid / 8000) * (width - padding * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centroidX, padding);
    ctx.lineTo(centroidX, height - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Centroid label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${features.centroid.toFixed(0)} Hz`, centroidX, padding - 10);

    // Volume indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Volume: ${(features.volume * 100).toFixed(1)}%`, 10, 25);
  };

  const getVisemeDescription = (viseme: VISEMES): string => {
    const descriptions: Record<VISEMES, string> = {
      [VISEMES.sil]: 'Silence - mouth closed',
      [VISEMES.PP]: 'P, B sounds - lips pressed',
      [VISEMES.FF]: 'F, V sounds - lower lip to teeth',
      [VISEMES.TH]: 'Th sounds - tongue between teeth',
      [VISEMES.DD]: 'D, T sounds - tongue to roof',
      [VISEMES.kk]: 'K, G sounds - tongue to back',
      [VISEMES.CH]: 'Ch, J sounds - tongue raised',
      [VISEMES.SS]: 'S, Z sounds - tongue groove',
      [VISEMES.nn]: 'N, M sounds - mouth closed',
      [VISEMES.RR]: 'R, L sounds - tongue curl',
      [VISEMES.aa]: 'Ah sound - mouth wide open',
      [VISEMES.E]: 'Eh sound - mouth medium wide',
      [VISEMES.I]: 'Ee sound - mouth narrow',
      [VISEMES.O]: 'Oh sound - mouth round',
      [VISEMES.U]: 'Oo sound - lips pursed'
    };
    return descriptions[viseme] || 'Unknown viseme';
  };

  return (
    <div className="visualizer-panel\">
      <h3>📊 Audio Analysis</h3>
      
      {/* Current Viseme */}
      <div className="current-viseme\">
        <div className="viseme-display\">
          <span className="viseme-code\">{state.viseme.replace('viseme_', '')}</span>
          <span className="viseme-description\">{getVisemeDescription(state.viseme)}</span>
        </div>
      </div>

      {/* Frequency Visualization */}
      <div className="frequency-viz\">
        <h4>Frequency Bands</h4>
        <canvas
          ref={canvasRef}
          className="frequency-canvas\"
          width={300}
          height={150}
        />
      </div>

      {/* Feature Values */}
      <div className="feature-values\">
        <h4>Audio Features</h4>
        <div className="feature-grid\">
          <div className="feature-item\">
            <span className="feature-label\">Volume:</span>
            <span className="feature-value\">{(state.features.volume * 100).toFixed(1)}%</span>
          </div>
          <div className="feature-item\">
            <span className="feature-label\">Centroid:</span>
            <span className="feature-value\">{state.features.centroid.toFixed(0)} Hz</span>
          </div>
          <div className="feature-item\">
            <span className="feature-label\">Status:</span>
            <span className={`feature-value ${state.isPlaying ? 'playing' : 'paused'}`}>
              {state.isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Band Details */}
      <div className="band-details\">
        <h4>Band Energies</h4>
        <div className="band-grid\">
          {state.features.bands.map((energy, index) => (
            <div key={index} className="band-item\">
              <span className="band-label\">B{index + 1}:</span>
              <div className="band-bar\">
                <div 
                  className="band-fill\" 
                  style={{ width: `${energy * 100}%` }}
                />
              </div>
              <span className="band-value\">{(energy * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
