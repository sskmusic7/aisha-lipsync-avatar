import { create } from 'zustand';

/**
 * TTS State Store
 * Tracks when Aisha is speaking to automatically control animations
 */
export const useTTSStore = create((set) => ({
  isSpeaking: false,
  
  startSpeaking: () => set({ isSpeaking: true }),
  
  stopSpeaking: () => set({ isSpeaking: false }),
}));

