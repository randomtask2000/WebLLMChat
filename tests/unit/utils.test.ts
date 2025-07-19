import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTime, formatRelativeTime } from '$lib/utils/timeFormat';
import { estimateTokenCount } from '$lib/utils/tokenCount';
import { detectDevice, isMobileDevice, isTabletDevice } from '$lib/utils/mobile';
import { loadModel, unloadModel, getLoadedModels } from '$lib/utils/model-loading';

describe('Time Formatting Utils', () => {
  describe('formatTime', () => {
    it('should format timestamp to time string', () => {
      const timestamp = new Date('2024-01-01T14:30:00').getTime();
      const formatted = formatTime(timestamp);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)?/);
    });

    it('should handle invalid timestamp', () => {
      const formatted = formatTime(NaN);
      expect(formatted).toBe('Invalid Date');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format as "just now" for recent times', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 30000); // 30 seconds ago
      expect(formatted).toBe('just now');
    });

    it('should format minutes ago', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 120000); // 2 minutes ago
      expect(formatted).toBe('2 minutes ago');
    });

    it('should format hours ago', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 7200000); // 2 hours ago
      expect(formatted).toBe('2 hours ago');
    });

    it('should format days ago', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 172800000); // 2 days ago
      expect(formatted).toBe('2 days ago');
    });

    it('should format as date for older times', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 864000000); // 10 days ago
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });
});

describe('Token Count Utils', () => {
  describe('estimateTokenCount', () => {
    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    it('should handle empty text', () => {
      const count = estimateTokenCount('');
      expect(count).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      const count = estimateTokenCount(longText);
      expect(count).toBeGreaterThan(100);
    });

    it('should handle special characters', () => {
      const text = 'Hello! How are you? 😊';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
    });

    it('should handle code blocks', () => {
      const code = '```javascript\nfunction hello() {\n  console.log("Hello");\n}\n```';
      const count = estimateTokenCount(code);
      expect(count).toBeGreaterThan(10);
    });
  });
});

describe('Mobile Detection Utils', () => {
  describe('detectDevice', () => {
    const originalUserAgent = navigator.userAgent;

    afterEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
    });

    it('should detect mobile device', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const device = detectDevice();
      expect(device).toBe('mobile');
    });

    it('should detect tablet device', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const device = detectDevice();
      expect(device).toBe('tablet');
    });

    it('should detect desktop device', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
      });
      
      const device = detectDevice();
      expect(device).toBe('desktop');
    });
  });

  describe('isMobileDevice', () => {
    it('should return true for mobile', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      expect(isMobileDevice()).toBe(true);
    });

    it('should return false for desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
      });
      
      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('isTabletDevice', () => {
    it('should return true for tablet', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      expect(isTabletDevice()).toBe(true);
    });

    it('should return false for mobile', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      expect(isTabletDevice()).toBe(false);
    });
  });
});

describe('Model Loading Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset loaded models
    getLoadedModels().forEach(modelId => unloadModel(modelId));
  });

  describe('loadModel', () => {
    it('should load a model', async () => {
      const modelId = 'test-model';
      const mockEngine = { dispose: vi.fn() };
      
      await loadModel(modelId, mockEngine as any);
      
      expect(getLoadedModels()).toContain(modelId);
    });

    it('should replace existing model with same ID', async () => {
      const modelId = 'test-model';
      const mockEngine1 = { dispose: vi.fn() };
      const mockEngine2 = { dispose: vi.fn() };
      
      await loadModel(modelId, mockEngine1 as any);
      await loadModel(modelId, mockEngine2 as any);
      
      expect(mockEngine1.dispose).toHaveBeenCalled();
      expect(getLoadedModels()).toContain(modelId);
      expect(getLoadedModels()).toHaveLength(1);
    });
  });

  describe('unloadModel', () => {
    it('should unload a model', async () => {
      const modelId = 'test-model';
      const mockEngine = { dispose: vi.fn() };
      
      await loadModel(modelId, mockEngine as any);
      unloadModel(modelId);
      
      expect(mockEngine.dispose).toHaveBeenCalled();
      expect(getLoadedModels()).not.toContain(modelId);
    });

    it('should handle unloading non-existent model', () => {
      expect(() => unloadModel('non-existent')).not.toThrow();
    });
  });

  describe('getLoadedModels', () => {
    it('should return list of loaded models', async () => {
      const mockEngine1 = { dispose: vi.fn() };
      const mockEngine2 = { dispose: vi.fn() };
      
      await loadModel('model1', mockEngine1 as any);
      await loadModel('model2', mockEngine2 as any);
      
      const loaded = getLoadedModels();
      expect(loaded).toHaveLength(2);
      expect(loaded).toContain('model1');
      expect(loaded).toContain('model2');
    });
  });
});