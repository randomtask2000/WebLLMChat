// Configuration flags for enabling/disabling features
export interface FeatureFlags {
  dragDropUpload: boolean;
  clientSideRAG: boolean;
  documentEmbeddings: boolean;
  vectorSearch: boolean;
  ragContextDisplay: boolean;
}

// Default feature flag values
export const DEFAULT_FEATURES: FeatureFlags = {
  dragDropUpload: true,
  clientSideRAG: true,
  documentEmbeddings: true,
  vectorSearch: true,
  ragContextDisplay: true
};

// LocalStorage key for feature flags
export const FEATURE_FLAG_STORAGE_KEY = 'webllm_feature_flags';

// Manages feature flags with localStorage persistence
export class FeatureManager {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
  }

  // Loads feature flags from localStorage
  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem(FEATURE_FLAG_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FEATURES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }
    return { ...DEFAULT_FEATURES };
  }

  // Persists feature flags to localStorage
  private saveFlags(): void {
    try {
      localStorage.setItem(FEATURE_FLAG_STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  // Checks if a feature is enabled
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  // Enables a specific feature
  enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
    this.saveFlags();
  }

  // Disables a specific feature
  disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
    this.saveFlags();
  }

  // Toggles a feature and returns new state
  toggle(feature: keyof FeatureFlags): boolean {
    this.flags[feature] = !this.flags[feature];
    this.saveFlags();
    return this.flags[feature];
  }

  // Returns all current feature flags
  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  // Updates multiple feature flags at once
  setAll(flags: Partial<FeatureFlags>): void {
    this.flags = { ...this.flags, ...flags };
    this.saveFlags();
  }
}

// Singleton instance of feature manager
export const featureManager = new FeatureManager();

// RAG Settings
// Configuration settings for RAG functionality
export interface RAGSettings {
  chunkSize: number;
  overlapSize: number;
  searchAccuracy: number;
}

// Default RAG configuration values
export const DEFAULT_RAG_SETTINGS: RAGSettings = {
  chunkSize: 300,
  overlapSize: 20, // Reduced from 50 to minimize repetition
  searchAccuracy: 50 // 0-100 scale, 50 is balanced
};

// LocalStorage key for RAG settings
export const RAG_SETTINGS_STORAGE_KEY = 'webllm_rag_settings';

// Manages RAG settings with localStorage persistence
export class RAGSettingsManager {
  private settings: RAGSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  // Loads RAG settings from localStorage
  private loadSettings(): RAGSettings {
    try {
      const stored = localStorage.getItem(RAG_SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_RAG_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load RAG settings from storage:', error);
    }
    return { ...DEFAULT_RAG_SETTINGS };
  }

  // Persists RAG settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem(RAG_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save RAG settings to storage:', error);
    }
  }

  // Gets current chunk size setting
  getChunkSize(): number {
    return this.settings.chunkSize;
  }

  // Sets chunk size with bounds validation
  setChunkSize(size: number): void {
    this.settings.chunkSize = Math.max(50, Math.min(1000, size));
    this.saveSettings();
  }

  // Gets current overlap size setting
  getOverlapSize(): number {
    return this.settings.overlapSize;
  }

  // Sets overlap size with bounds validation
  setOverlapSize(size: number): void {
    this.settings.overlapSize = Math.max(0, Math.min(200, size));
    this.saveSettings();
  }

  // Returns all current RAG settings
  getAll(): RAGSettings {
    return { ...this.settings };
  }

  // Gets current search accuracy setting
  getSearchAccuracy(): number {
    return this.settings.searchAccuracy;
  }

  // Sets search accuracy with bounds validation
  setSearchAccuracy(accuracy: number): void {
    this.settings.searchAccuracy = Math.max(0, Math.min(100, accuracy));
    this.saveSettings();
  }
}

// Singleton instance of RAG settings manager
export const ragSettingsManager = new RAGSettingsManager();
