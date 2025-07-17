export interface FeatureFlags {
  dragDropUpload: boolean;
  clientSideRAG: boolean;
  documentEmbeddings: boolean;
  vectorSearch: boolean;
  ragContextDisplay: boolean;
}

export const DEFAULT_FEATURES: FeatureFlags = {
  dragDropUpload: true,
  clientSideRAG: true,
  documentEmbeddings: true,
  vectorSearch: true,
  ragContextDisplay: true
};

export const FEATURE_FLAG_STORAGE_KEY = 'webllm_feature_flags';

export class FeatureManager {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
  }

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

  private saveFlags(): void {
    try {
      localStorage.setItem(FEATURE_FLAG_STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
    this.saveFlags();
  }

  disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
    this.saveFlags();
  }

  toggle(feature: keyof FeatureFlags): boolean {
    this.flags[feature] = !this.flags[feature];
    this.saveFlags();
    return this.flags[feature];
  }

  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  setAll(flags: Partial<FeatureFlags>): void {
    this.flags = { ...this.flags, ...flags };
    this.saveFlags();
  }
}

export const featureManager = new FeatureManager();

// RAG Settings
export interface RAGSettings {
  chunkSize: number;
  overlapSize: number;
  searchAccuracy: number;
}

export const DEFAULT_RAG_SETTINGS: RAGSettings = {
  chunkSize: 300,
  overlapSize: 50,
  searchAccuracy: 50 // 0-100 scale, 50 is balanced
};

export const RAG_SETTINGS_STORAGE_KEY = 'webllm_rag_settings';

export class RAGSettingsManager {
  private settings: RAGSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

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

  private saveSettings(): void {
    try {
      localStorage.setItem(RAG_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save RAG settings to storage:', error);
    }
  }

  getChunkSize(): number {
    return this.settings.chunkSize;
  }

  setChunkSize(size: number): void {
    this.settings.chunkSize = Math.max(50, Math.min(1000, size));
    this.saveSettings();
  }

  getOverlapSize(): number {
    return this.settings.overlapSize;
  }

  setOverlapSize(size: number): void {
    this.settings.overlapSize = Math.max(0, Math.min(200, size));
    this.saveSettings();
  }

  getAll(): RAGSettings {
    return { ...this.settings };
  }

  getSearchAccuracy(): number {
    return this.settings.searchAccuracy;
  }

  setSearchAccuracy(accuracy: number): void {
    this.settings.searchAccuracy = Math.max(0, Math.min(100, accuracy));
    this.saveSettings();
  }
}

export const ragSettingsManager = new RAGSettingsManager();
