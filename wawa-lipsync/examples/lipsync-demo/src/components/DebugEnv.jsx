import React from 'react';

export function DebugEnv() {
  const hasApiKey = !!import.meta.env.VITE_ELEVENLABS_API_KEY;
  const keyPreview = import.meta.env.VITE_ELEVENLABS_API_KEY 
    ? `${import.meta.env.VITE_ELEVENLABS_API_KEY.substring(0, 8)}...`
    : 'Not found';
  
  if (import.meta.env.PROD) return null; // Don't show in production
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      left: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      <div>🔑 ElevenLabs API: {hasApiKey ? '✅' : '❌'} {keyPreview}</div>
      <div>🌍 Environment: {import.meta.env.MODE}</div>
      <div>📅 Build: {new Date().toLocaleTimeString()}</div>
    </div>
  );
}
