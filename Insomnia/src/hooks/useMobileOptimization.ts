'use client';

import { useState, useEffect, useCallback } from 'react';

interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
  hasHover: boolean;
  viewportHeight: number;
  viewportWidth: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface MobileOptimizationHook extends MobileOptimizationState {
  optimizedTouchTarget: (baseSize: number) => number;
  preventZoom: () => void;
  enableHapticFeedback: (type?: 'light' | 'medium' | 'heavy') => void;
  optimizeForKeyboard: (element: HTMLElement | null) => void;
}

export const useMobileOptimization = (): MobileOptimizationHook => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: 'lg',
    orientation: 'landscape',
    touchDevice: false,
    hasHover: true,
    viewportHeight: 768,
    viewportWidth: 1024,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  // Update device information
  const updateDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Screen size breakpoints (Tailwind CSS standard)
    let screenSize: MobileOptimizationState['screenSize'] = 'xs';
    if (width >= 1536) screenSize = '2xl';
    else if (width >= 1280) screenSize = 'xl';
    else if (width >= 1024) screenSize = 'lg';
    else if (width >= 768) screenSize = 'md';
    else if (width >= 640) screenSize = 'sm';

    // Device type detection
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    // Touch and hover detection
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasHover = window.matchMedia('(hover: hover)').matches;

    // Orientation
    const orientation = height > width ? 'portrait' : 'landscape';

    // Safe area insets (for notches, etc.)
    const computedStyle = getComputedStyle(document.documentElement);
    const safeAreaInsets = {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0,
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
    };

    setState({
      isMobile,
      isTablet,
      isDesktop,
      screenSize,
      orientation,
      touchDevice,
      hasHover,
      viewportHeight: height,
      viewportWidth: width,
      safeAreaInsets,
    });
  }, []);

  // Initialize and listen for changes
  useEffect(() => {
    updateDeviceInfo();
    
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [updateDeviceInfo]);

  // Optimize touch target size (minimum 44px for accessibility)
  const optimizedTouchTarget = useCallback((baseSize: number): number => {
    if (!state.touchDevice) return baseSize;
    
    const minimumTouchSize = 44; // iOS/Android guidelines
    const scaleFactor = state.isMobile ? 1.2 : 1.0;
    
    return Math.max(baseSize * scaleFactor, minimumTouchSize);
  }, [state.touchDevice, state.isMobile]);

  // Prevent zoom on double tap
  const preventZoom = useCallback(() => {
    if (typeof document === 'undefined') return;
    
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }, []);

  // Haptic feedback for touch devices
  const enableHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!state.touchDevice || typeof navigator === 'undefined') return;
    
    // Use Haptic API if available (iOS Safari)
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate(patterns[type]);
    }
    
    // Use WebKit Haptic API if available
    const webkit = navigator as Navigator & { webkitVibrate?: (intensity: number) => void };
    if (webkit.webkitVibrate) {
      const intensity = type === 'light' ? 1 : type === 'medium' ? 2 : 3;
      webkit.webkitVibrate(intensity);
    }
  }, [state.touchDevice]);

  // Optimize for virtual keyboard
  const optimizeForKeyboard = useCallback((element: HTMLElement | null) => {
    if (!element || !state.isMobile) return;
    
    const handleFocus = () => {
      // Scroll element into view when virtual keyboard appears
      setTimeout(() => {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300); // Delay for keyboard animation
    };
    
    const handleBlur = () => {
      // Reset viewport when keyboard disappears
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    };
    
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    
    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [state.isMobile]);

  return {
    ...state,
    optimizedTouchTarget,
    preventZoom,
    enableHapticFeedback,
    optimizeForKeyboard,
  };
};
