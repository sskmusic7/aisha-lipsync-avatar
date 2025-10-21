import { useEffect, useRef, useState } from "react";
import { lipsyncManager } from "../App";

const audioFiles = [
  {
    name: "Emma (ElevenLabs)",
    files: [
      {
        name: "A",
        path: "audios/ElevenLabs_Emma_a.mp3",
      },
      {
        name: "E",
        path: "audios/ElevenLabs_Emma_e.mp3",
      },
      {
        name: "O",
        path: "audios/ElevenLabs_Emma_o.mp3",
      },
      {
        name: "You",
        path: "audios/ElevenLabs_Emma_you.mp3",
      },
      {
        name: "Vowels",
        path: "audios/ElevenLabs_Emma_vowels.mp3",
      },

      {
        name: "Ta",
        path: "audios/ElevenLabs_Emma_ta.mp3",
      },
      {
        name: "Click",
        path: "audios/ElevenLabs_Emma_click.mp3",
      },
      {
        name: "Bump",
        path: "audios/ElevenLabs_Emma_bump.mp3",
      },
      {
        name: "Not",
        path: "audios/ElevenLabs_Emma_not.mp3",
      },
      {
        name: "Lot",
        path: "audios/ElevenLabs_Emma_lot.mp3",
      },
      {
        name: "Think",
        path: "audios/ElevenLabs_Emma_think.mp3",
      },
      {
        name: "Fan",
        path: "audios/ElevenLabs_Emma_fan.mp3",
      },
      {
        name: "This",
        path: "audios/ElevenLabs_Emma_this.mp3",
      },
      {
        name: "Consonants",
        path: "audios/ElevenLabs_Emma_consonants.mp3",
      },
    ],
  },
  {
    name: "Liam (ElevenLabs)",
    files: [
      {
        name: "A",
        path: "audios/ElevenLabs_Liam_a.mp3",
      },
      {
        name: "E",
        path: "audios/ElevenLabs_Liam_e.mp3",
      },
      {
        name: "O",
        path: "audios/ElevenLabs_Liam_o.mp3",
      },
      {
        name: "You",
        path: "audios/ElevenLabs_Liam_you.mp3",
      },
      {
        name: "Vowels",
        path: "audios/ElevenLabs_Liam_vowels.mp3",
      },
      {
        name: "Ta",
        path: "audios/ElevenLabs_Liam_ta.mp3",
      },
      {
        name: "Click",
        path: "audios/ElevenLabs_Liam_click.mp3",
      },
      {
        name: "Bump",
        path: "audios/ElevenLabs_Liam_bump.mp3",
      },
      {
        name: "Not",
        path: "audios/ElevenLabs_Liam_not.mp3",
      },
      {
        name: "Lot",
        path: "audios/ElevenLabs_Liam_lot.mp3",
      },
      {
        name: "Think",
        path: "audios/ElevenLabs_Liam_think.mp3",
      },
      {
        name: "Fan",
        path: "audios/ElevenLabs_Liam_fan.mp3",
      },
      {
        name: "This",
        path: "audios/ElevenLabs_Liam_this.mp3",
      },
      {
        name: "Consonants",
        path: "audios/ElevenLabs_Liam_consonants.mp3",
      },
    ],
  },
  {
    name: "Misc",
    files: [
      {
        name: "ElevenLabs long test",
        path: "audios/ElevenLabs_Text_to_Speech_audio.mp3",
      },
      {
        name: "OpenAI Alloy test",
        path: "audios/OpenAI_Alloy_test.mp3",
      },
      {
        name: "OpenAI Alloy test (short)",
        path: "audios/OpenAI_Alloy_test_short.mp3",
      },
    ],
  },
];

export const Visualizer = () => {
  const canvasRef = useRef(null);
  const visemeRef = useRef(null);
  const volumeRef = useRef(null);
  const centroidRef = useRef(null);

  const audioRef = useRef(null);
  const [audioFile, setAudioFile] = useState("");
  
  // Microphone state
  const [isMicActive, setIsMicActive] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [detectedVisemes, setDetectedVisemes] = useState([]);

  useEffect(() => {
    const handleAudioEnded = () => {
      setAudioFile("");
    };
    audioRef.current?.addEventListener("ended", handleAudioEnded);
    return () => {
      audioRef.current?.removeEventListener("ended", handleAudioEnded);
    };
  }, []);

  useEffect(() => {
    if (!audioFile) {
      return;
    }
    setDetectedVisemes([]);

    // Create or update audio element
    audioRef.current.src = audioFile; // Update source
    lipsyncManager.connectAudio(audioRef.current);

    // Connect audio to lipsync
    audioRef.current.play();

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        // Do not clear src to allow reuse
      }
    };
  }, [audioFile]);

  // Microphone control functions
  const toggleMicrophone = async () => {
    if (isMicActive) {
      // Stop microphone properly
      lipsyncManager.disconnectMicrophone();
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
      }
      setIsMicActive(false);
      setDetectedVisemes([]);
      console.log('🛑 Microphone stopped');
    } else {
      // Start microphone
      try {
        // Stop any current audio first
        if (audioRef.current) {
          audioRef.current.pause();
          setAudioFile("");
        }
        
        console.log('🎤 Starting microphone...');
        const source = await lipsyncManager.connectMicrophone();
        setMicStream(source);
        setIsMicActive(true);
        setDetectedVisemes([]);
        console.log('✅ Microphone started');
      } catch (error) {
        console.error("Failed to access microphone:", error);
        alert("Could not access microphone. Please check your browser permissions.");
        setIsMicActive(false);
      }
    }
  };

  const prevViseme = useRef(null);

  useEffect(() => {
    const drawVisualisation = (features, viseme) => {
      if (!canvasRef.current) {
        return; // Canvas not mounted yet
      }
      const ctx = canvasRef.current.getContext("2d");
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const maxCentroid = 7000; // Max frequency to display

      // Define virtual padding
      const padding = {
        left: 60, // Space for Y-axis labels
        right: 60, // Small buffer for right edge
        top: 60, // Small buffer for top edge
        bottom: 30, // Space for X-axis labels
      };

      // Calculate content area
      const contentWidth = width - padding.left - padding.right;
      const contentHeight = height - padding.top - padding.bottom;
      const barWidth = contentWidth / features.bands.length;

      // Clear canvas
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // Draw frequency bands
      features.bands.forEach((energy, i) => {
        const barHeight = energy * contentHeight;
        ctx.fillStyle = `hsl(${i * (360 / features.bands.length)}, 70%, 50%)`;
        ctx.fillRect(
          padding.left + i * barWidth,
          height - padding.bottom - barHeight,
          barWidth - 2,
          barHeight
        );
      });

      // Draw centroid
      const centroidX =
        padding.left + (features.centroid / maxCentroid) * contentWidth;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centroidX, padding.top);
      ctx.lineTo(centroidX, height - padding.bottom);
      ctx.stroke();

      // Draw X-axis (frequency) legend
      ctx.fillStyle = "white";
      ctx.font = "15px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const xTicks = [0, 200, 400, 800, 1500, 2500, 4000, 8000]; // Frequency values in Hz
      xTicks.forEach((freq, i) => {
        const x = padding.left + i * barWidth;
        ctx.fillText(`${freq} Hz`, x, height - padding.bottom + 5); // Position in bottom padding
        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(x, height - padding.bottom - 5);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      });

      const xTicksCentroid = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000]; // Frequency values in Hz
      xTicksCentroid.forEach((freq, i) => {
        const x = padding.left + i * barWidth;
        ctx.fillText(`${freq} Hz`, x, padding.top + 5); // Position in bottom padding
        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(x, padding.top - 5);
        ctx.lineTo(x, padding.top);
        ctx.stroke();
      });

      // Draw Y-axis (energy) legend
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const yTicks = [0, 0.25, 0.5, 0.75, 1]; // Energy values (normalized)
      yTicks.forEach((energy) => {
        const y = height - padding.bottom - energy * contentHeight;
        ctx.fillText(energy.toFixed(2), padding.left - 10, y); // Position in left padding
        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(padding.left - 5, y);
        ctx.lineTo(padding.left, y);
        ctx.stroke();
      });
    };

    const analyzeAudio = () => {
      requestAnimationFrame(analyzeAudio);
      lipsyncManager.processAudio();
      const viseme = lipsyncManager.viseme;
      const features = lipsyncManager.features;
      if (visemeRef.current) {
        visemeRef.current.innerText = viseme;
      }
      if (volumeRef.current) {
        volumeRef.current.innerText = features.volume.toFixed(2);
      }
      if (centroidRef.current) {
        centroidRef.current.innerText = `${features.centroid.toFixed(2)} Hz`;
      }
      drawVisualisation(features, viseme);
      if (viseme !== prevViseme.current) {
        setDetectedVisemes((prev) => [...prev, viseme]);
        prevViseme.current = viseme;
      }
    };

    analyzeAudio();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg"
          width={1000}
          height={500}
        />
        <audio ref={audioRef} controls className="w-full" />
        
        {/* Microphone Controls */}
        <div className="flex flex-row items-center justify-center gap-4">
          <button
            onClick={toggleMicrophone}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isMicActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isMicActive ? '🛑 Stop Microphone' : '🎤 Start Microphone'}
          </button>
          {isMicActive && (
            <span className="text-green-600 font-medium">
              🟢 Live microphone active
            </span>
          )}
        </div>
        
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="text-center">
            <p className="text-5xl" ref={visemeRef}>
              SI
            </p>
            <h2>Viseme</h2>
          </div>
          <div className="text-center">
            <p className="text-5xl" ref={volumeRef}>
              122db
            </p>
            <h2>Volume</h2>
          </div>
          <div className="text-center">
            <p className="text-5xl" ref={centroidRef}>
              1000 Hz
            </p>
            <h2>Centroid</h2>
          </div>
        </div>
        {detectedVisemes.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-left">Detected Visemes</h2>
            <div className="flex flex-row items-center justify-start gap-2  flex-wrap">
              {detectedVisemes.map((viseme, index) => (
                <span
                  key={index}
                  className="p-2 text-black font-medium bg-pink-100 rounded min-w-12"
                >
                  {viseme.replace("viseme_", "")}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
      <div className="pointer-events-auto flex flex-col gap-4">
        {audioFiles.map((section, sectionIndex) => (
          <div key={sectionIndex} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-left">{section.name}</h2>
            <div className="flex flex-row items-center justify-start gap-2 flex-wrap">
              {section.files.map((audio, index) => (
                <button
                  key={index}
                  className="p-2 text-white bg-indigo-500 hover:bg-indigo-600 cursor-pointer rounded min-w-12"
                  onClick={() => setAudioFile(audio.path)}
                >
                  {audio.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
