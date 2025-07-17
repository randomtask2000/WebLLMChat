/**
 * Mobile-specific utilities for Capacitor app
 */

import { Capacitor } from '@capacitor/core';

export function isMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function getDeviceInfo() {
  return {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isWeb: !Capacitor.isNativePlatform()
  };
}

// Mobile-specific WebLLM optimizations
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
export function canHandleLargeModels(): boolean {
  if (!isMobile()) return true;

  // Conservative estimation for mobile devices
  const memory = (navigator as any).deviceMemory;
  return memory && memory >= 4; // 4GB+ RAM
}

// Mobile-specific UI helpers
export function getMobileUIConfig() {
  return {
    sidebarCollapsed: isMobile(),
    compactMode: isMobile(),
    touchOptimized: isMobile(),
    keyboardAware: isMobile()
  };
}

// Storage helpers for mobile
export function getStoragePrefix(): string {
  return isMobile() ? 'mobile_' : 'web_';
}

// Network awareness for mobile
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
