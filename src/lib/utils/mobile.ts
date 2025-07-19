/**
 * Mobile-specific utilities for Capacitor app
 */

import { Capacitor } from '@capacitor/core';

// Checks if running on native mobile platform
export function isMobile(): boolean {
  return Capacitor.isNativePlatform();
}

// Checks if running on iOS platform
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

// Checks if running on Android platform
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

// Returns platform and environment information
export function getDeviceInfo() {
  return {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isWeb: !Capacitor.isNativePlatform()
  };
}

// Mobile-specific WebLLM optimizations
// Returns list of models optimized for mobile devices
export function getMobileOptimizedModels() {
  const mobileModels = [
    'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    'Phi-3.5-mini-instruct-q4f16_1-MLC',
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
  ];

  return mobileModels;
}

// Check if device can handle larger models (rough estimation)
// Estimates if device can handle larger AI models
export function canHandleLargeModels(): boolean {
  if (!isMobile()) return true;

  // Conservative estimation for mobile devices
  const memory = (navigator as any).deviceMemory;
  return memory && memory >= 4; // 4GB+ RAM
}

// Mobile-specific UI helpers
// Returns UI configuration optimized for mobile
export function getMobileUIConfig() {
  return {
    sidebarCollapsed: isMobile(),
    compactMode: isMobile(),
    touchOptimized: isMobile(),
    keyboardAware: isMobile()
  };
}

// Storage helpers for mobile
// Returns platform-specific storage key prefix
export function getStoragePrefix(): string {
  return isMobile() ? 'mobile_' : 'web_';
}

// Network awareness for mobile
// Checks if model download should be delayed on slow networks
export function shouldDelayModelDownload(): boolean {
  if (!isMobile()) return false;

  // Check for cellular connection (if available)
  const connection = (navigator as any).connection;
  if (connection) {
    return (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.saveData
    );
  }

  return false;
}

// Device detection functions
// Detects device type from user agent
export function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for tablets first (they often contain mobile keywords too)
  if (/ipad|android.*tablet|tablet.*android|android.*pad|kindle|silk/i.test(userAgent)) {
    return 'tablet';
  }
  
  // Check for mobile devices
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
    return 'mobile';
  }
  
  // Default to desktop
  return 'desktop';
}

// Checks if device is mobile phone
export function isMobileDevice(): boolean {
  return detectDevice() === 'mobile';
}

// Checks if device is tablet
export function isTabletDevice(): boolean {
  return detectDevice() === 'tablet';
}
