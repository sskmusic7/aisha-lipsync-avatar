import { Loader } from "@react-three/drei";
import { Lipsync } from "wawa-lipsync";
import { UI } from "./components/UI";
import { useEffect } from "react";

// Optimize for faster, more responsive lip-sync
export const lipsyncManager = new Lipsync({
  // Much smaller buffer size for ultra-low latency
  fftSize: 256, // Even smaller for faster processing
  // Much faster smoothing for immediate response
  smoothingFactor: 0.1, // Much lower for instant response
  // Add these for better real-time performance
  minVolumeThreshold: 0.001, // Lower threshold to catch quiet sounds
  maxVolumeThreshold: 0.8, // Prevent over-amplification
});

function App() {
  // Global lipsync processing loop - runs continuously
  useEffect(() => {
    const analyzeAudio = () => {
      requestAnimationFrame(analyzeAudio);
      lipsyncManager.processAudio();
      
      // Debug: Log when we detect audio activity
      const features = lipsyncManager.features;
      if (features && features.volume > 0.01) {
        console.log('Lipsync processing audio - Volume:', features.volume.toFixed(3), 'Viseme:', lipsyncManager.viseme);
      }
    };
    
    analyzeAudio();
  }, []);

  return (
    <>
      <Loader />
      <UI />
    </>
  );
}

export default App;
