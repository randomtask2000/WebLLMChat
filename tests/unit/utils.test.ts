import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTime, formatRelativeTime } from '$lib/utils/timeFormat';
import { estimateTokenCount } from '$lib/utils/tokenCount';
import { detectDevice, isMobileDevice, isTabletDevice } from '$lib/utils/mobile';
import { loadModel, unloadModel, getLoadedModels } from '$lib/utils/model-loading';

describe('Time Formatting Utils', () => {
  describe('formatTime', () => {
    // Tests formatting of timestamp to human-readable time string
    it('should format timestamp to time string', () => {
      const timestamp = new Date('2024-01-01T14:30:00').getTime();
      const formatted = formatTime(timestamp);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)?/);
    });

    // Tests handling of invalid timestamps gracefully
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

    // Tests formatting times within last minute as "just now"
    it('should format as "just now" for recent times', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 30000); // 30 seconds ago
      expect(formatted).toBe('just now');
    });

    // Tests formatting times in minutes ago format
    it('should format minutes ago', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 120000); // 2 minutes ago
      expect(formatted).toBe('2 minutes ago');
    });

    // Tests formatting times in hours ago format
    it('should format hours ago', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 7200000); // 2 hours ago
      expect(formatted).toBe('2 hours ago');
    });

    // Tests formatting times in days ago format
    it('should format days ago', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 172800000); // 2 days ago
      expect(formatted).toBe('2 days ago');
    });

    // Tests formatting older times as full date
    it('should format as date for older times', () => {
      const now = Date.now();
      const formatted = formatRelativeTime(now - 864000000); // 10 days ago
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });
});

describe('Token Count Utils', () => {
  describe('estimateTokenCount', () => {
    // Tests token estimation for basic text strings
    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    // Tests token count returns 0 for empty strings
    it('should handle empty text', () => {
      const count = estimateTokenCount('');
      expect(count).toBe(0);
    });

    // Tests token estimation scales appropriately for long text
    it('should handle long text', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      const count = estimateTokenCount(longText);
      expect(count).toBeGreaterThan(100);
    });

    // Tests token counting with special characters and emoji
    it('should handle special characters', () => {
      const text = 'Hello! How are you? 😊';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
    });

    // Tests token estimation for markdown code blocks
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

    // Tests detection of mobile devices from user agent
    it('should detect mobile device', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const device = detectDevice();
      expect(device).toBe('mobile');
    });

    // Tests detection of tablet devices from user agent
    it('should detect tablet device', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const device = detectDevice();
      expect(device).toBe('tablet');
    });

    // Tests detection of desktop devices from user agent
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
    // Tests isMobileDevice returns true for mobile user agents
    it('should return true for mobile', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      expect(isMobileDevice()).toBe(true);
    });

    // Tests isMobileDevice returns false for desktop user agents
    it('should return false for desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
      });
      
      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('isTabletDevice', () => {
    // Tests isTabletDevice returns true for tablet user agents
    it('should return true for tablet', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      expect(isTabletDevice()).toBe(true);
    });

    // Tests isTabletDevice returns false for mobile user agents
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
    // Tests loading a model and adding it to loaded models list
    it('should load a model', async () => {
      const modelId = 'test-model';
      const mockEngine = { dispose: vi.fn() };
      
      await loadModel(modelId, mockEngine as any);
      
      expect(getLoadedModels()).toContain(modelId);
    });

    // Tests replacing an existing model disposes old instance
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
    // Tests unloading a model disposes it and removes from list
    it('should unload a model', async () => {
      const modelId = 'test-model';
      const mockEngine = { dispose: vi.fn() };
      
      await loadModel(modelId, mockEngine as any);
      unloadModel(modelId);
      
      expect(mockEngine.dispose).toHaveBeenCalled();
      expect(getLoadedModels()).not.toContain(modelId);
    });

    // Tests unloading non-existent model doesn't throw error
    it('should handle unloading non-existent model', () => {
      expect(() => unloadModel('non-existent')).not.toThrow();
    });
  });

  describe('getLoadedModels', () => {
    // Tests getLoadedModels returns all currently loaded model IDs
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