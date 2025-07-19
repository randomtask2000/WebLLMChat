import { describe, it, expect, beforeEach } from 'vitest';
import { appConfig } from '$lib/config/app.config';
import { DEFAULT_FEATURES, FeatureManager } from '$lib/config/features';

describe('App Config', () => {
  // Tests app config contains correct title and description
  it('should have correct app information', () => {
    expect(appConfig.title).toBe('WebLLM Chat');
    expect(appConfig.description).toBe('Your privacy-first AI assistant with powerful document analysis');
  });
});

describe('Features Config', () => {
  describe('DEFAULT_FEATURES', () => {
    // Tests all expected feature flags are present in defaults
    it('should have all required feature flags', () => {
      expect(DEFAULT_FEATURES).toHaveProperty('dragDropUpload');
      expect(DEFAULT_FEATURES).toHaveProperty('clientSideRAG');
      expect(DEFAULT_FEATURES).toHaveProperty('documentEmbeddings');
      expect(DEFAULT_FEATURES).toHaveProperty('vectorSearch');
      expect(DEFAULT_FEATURES).toHaveProperty('ragContextDisplay');
    });

    // Tests feature flags have appropriate default values
    it('should have sensible defaults', () => {
      expect(DEFAULT_FEATURES.dragDropUpload).toBe(true);
      expect(DEFAULT_FEATURES.clientSideRAG).toBe(true);
      expect(DEFAULT_FEATURES.documentEmbeddings).toBe(true);
      expect(DEFAULT_FEATURES.vectorSearch).toBe(true);
      expect(DEFAULT_FEATURES.ragContextDisplay).toBe(true);
    });
  });

  describe('FeatureManager', () => {
    let featureManager: FeatureManager;

    beforeEach(() => {
      localStorage.clear();
      featureManager = new FeatureManager();
    });

    // Tests FeatureManager initializes with default feature values
    it('should load default features', () => {
      expect(featureManager.isEnabled('dragDropUpload')).toBe(true);
      expect(featureManager.isEnabled('clientSideRAG')).toBe(true);
      expect(featureManager.isEnabled('documentEmbeddings')).toBe(true);
    });

    // Tests enabling a previously disabled feature flag
    it('should enable features', () => {
      featureManager.disable('dragDropUpload');
      expect(featureManager.isEnabled('dragDropUpload')).toBe(false);
      
      featureManager.enable('dragDropUpload');
      expect(featureManager.isEnabled('dragDropUpload')).toBe(true);
    });

    // Tests disabling a feature flag
    it('should disable features', () => {
      featureManager.disable('clientSideRAG');
      expect(featureManager.isEnabled('clientSideRAG')).toBe(false);
    });

    // Tests toggling a feature flag switches its state
    it('should toggle features', () => {
      const initial = featureManager.isEnabled('vectorSearch');
      featureManager.toggle('vectorSearch');
      expect(featureManager.isEnabled('vectorSearch')).toBe(!initial);
    });

    // Tests all individual feature flags can be retrieved
    it('should get all flags', () => {
      // Test all individual flags
      expect(featureManager.isEnabled('dragDropUpload')).toBe(true);
      expect(featureManager.isEnabled('clientSideRAG')).toBe(true);
      expect(featureManager.isEnabled('documentEmbeddings')).toBe(true);
      expect(featureManager.isEnabled('vectorSearch')).toBe(true);
      expect(featureManager.isEnabled('ragContextDisplay')).toBe(true);
    });

    // Tests feature flag changes persist across FeatureManager instances
    it('should persist flags to localStorage', () => {
      featureManager.disable('ragContextDisplay');
      
      // Create new instance to test persistence
      const newManager = new FeatureManager();
      expect(newManager.isEnabled('ragContextDisplay')).toBe(false);
    });
  });
});