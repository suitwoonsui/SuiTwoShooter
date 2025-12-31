'use client';

import { useCallback, useRef, useEffect } from 'react';

export const useGameAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<AudioBuffer[]>([]);
  const isLoadedRef = useRef(false);

  // Initialize audio context and load sounds
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        
        // Generate the three core sounds programmatically for quick deployment
        const sounds = [
          generateWaterDropSound,
          generateBoingSound,
          generateTrillSound,
        ];
        
        // Generate and store audio buffers
        for (const generateSound of sounds) {
          const buffer = generateSound(audioContextRef.current);
          audioBuffersRef.current.push(buffer);
        }
        
        isLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Generate water drop sound
  const generateWaterDropSound = (audioContext: AudioContext): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3; // 300ms
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const frequency = 800 + 400 * Math.exp(-t * 8); // Falling frequency
      const amplitude = Math.exp(-t * 6); // Decay
      data[i] = Math.sin(2 * Math.PI * frequency * t) * amplitude * 0.3;
    }
    
    return buffer;
  };

  // Generate boing sound
  const generateBoingSound = (audioContext: AudioContext): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.4; // 400ms
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const frequency = 200 + 300 * Math.sin(t * 20); // Bouncing frequency
      const amplitude = Math.exp(-t * 4); // Decay
      data[i] = Math.sin(2 * Math.PI * frequency * t) * amplitude * 0.4;
    }
    
    return buffer;
  };

  // Generate trill sound
  const generateTrillSound = (audioContext: AudioContext): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.25; // 250ms
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const frequency = 600 + 200 * Math.sin(t * 40); // Rapid frequency modulation
      const amplitude = Math.exp(-t * 8); // Quick decay
      data[i] = Math.sin(2 * Math.PI * frequency * t) * amplitude * 0.35;
    }
    
    return buffer;
  };

  // Play a random sound
  const playRandomSound = useCallback(() => {
    if (!isLoadedRef.current || !audioContextRef.current || audioBuffersRef.current.length === 0) {
      return;
    }

    try {
      // Resume audio context if suspended (mobile browsers)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Select random sound
      const randomIndex = Math.floor(Math.random() * audioBuffersRef.current.length);
      const buffer = audioBuffersRef.current[randomIndex];
      
      // Create and play sound
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }, []);

  return {
    playRandomSound,
    isLoaded: isLoadedRef.current,
  };
};
