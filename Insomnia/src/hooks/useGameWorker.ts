'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface GameWorkerMessage {
  type: string;
  data: Record<string, unknown>;
}

interface GameWorkerHook {
  postMessage: (type: string, data?: Record<string, unknown>) => void;
  isWorkerReady: boolean;
  lastMessage: GameWorkerMessage | null;
}

export const useGameWorker = (
  onMessage?: (message: GameWorkerMessage) => void
): GameWorkerHook => {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [lastMessage, setLastMessage] = useState<GameWorkerMessage | null>(null);

  useEffect(() => {
    // SSR Safety: Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('SSR: Web Worker not available during server-side rendering');
      return;
    }

    // Check if Worker is supported
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported in this environment');
      return;
    }

    try {
      // Create the worker
      workerRef.current = new Worker('/gameWorker.js');
      
      workerRef.current.onmessage = (e: MessageEvent<GameWorkerMessage>) => {
        const message = e.data;
        setLastMessage(message);
        
        if (onMessage) {
          onMessage(message);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Game Worker error:', error);
      };

      setIsWorkerReady(true);

    } catch (error) {
      console.error('Failed to create Game Worker:', error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setIsWorkerReady(false);
    };
  }, [onMessage]);

  const postMessage = useCallback((type: string, data?: Record<string, unknown>) => {
    if (workerRef.current && isWorkerReady) {
      workerRef.current.postMessage({ type, data });
    } else {
      console.warn('Game Worker not ready or not supported');
    }
  }, [isWorkerReady]);

  return {
    postMessage,
    isWorkerReady,
    lastMessage
  };
};
