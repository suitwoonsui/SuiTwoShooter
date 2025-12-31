'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentRenders: number;
  gameLoopTime: number;
}

interface PerformanceMonitorOptions {
  sampleInterval?: number;
  enableMemoryTracking?: boolean;
  enableFPSTracking?: boolean;
  logToConsole?: boolean;
}

export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceMonitorOptions = {}
) => {
  // DISABLED: Performance monitor is temporarily disabled to avoid build issues and memory consumption
  // The component can be re-enabled by uncommenting the code below when needed
  
  const [metrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentRenders: 0,
    gameLoopTime: 0
  });

  // Return minimal implementation to satisfy the interface
  const startRenderTimer = useCallback(() => {
    // DISABLED
  }, []);

  const endRenderTimer = useCallback(() => {
    // DISABLED
  }, []);

  const trackGameLoop = useCallback((_startTime: number) => {
    // DISABLED
  }, []);

  const checkPerformanceThresholds = useCallback(() => {
    return []; // Return empty warnings array
  }, []);

  const getOptimizationSuggestions = useCallback(() => {
    return []; // Return empty suggestions array
  }, []);

  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    trackGameLoop,
    checkPerformanceThresholds,
    getOptimizationSuggestions,
    warnings: []
  };
};
