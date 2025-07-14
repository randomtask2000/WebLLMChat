import { setModelDownloadProgress, setModelDownloadError, setModelDownloaded, currentModel, isModelLoaded, modelLoadingProgress, modelLoadingStatus } from '../stores/models';
import { get } from 'svelte/store';

class WebLLMService {
  private engine: any = null;
  private currentModelId: string = '';
  private webllm: any = null;

  private async loadWebLLM() {
    if (this.webllm) return this.webllm;
    
    try {
      console.log('🌐 Environment check:', {
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        webgl: !!document.createElement('canvas').getContext('webgl2'),
        worker: typeof Worker !== 'undefined',
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        crossOriginIsolated: window.crossOriginIsolated
      });

      console.log('📥 Loading WebLLM module...');
      const webllmModule = await import('@mlc-ai/web-llm');
      
      // Validate that we got the expected exports
      if (!webllmModule || typeof webllmModule !== 'object') {
        throw new Error('WebLLM module is not valid');
      }
      
      if (!webllmModule.MLCEngine || typeof webllmModule.MLCEngine !== 'function') {
        throw new Error('MLCEngine is not available or not a constructor');
      }
      
      this.webllm = webllmModule;
      console.log('✅ WebLLM loaded successfully with exports:', Object.keys(webllmModule));
      
      // Test basic functionality
      try {
        console.log('🧪 Testing WebLLM basic functionality...');
        const testEngine = new webllmModule.MLCEngine();
        console.log('✅ MLCEngine instantiation test passed');
        testEngine.unload?.(); // Clean up test engine
      } catch (testError) {
        console.warn('⚠️ WebLLM basic functionality test failed:', testError);
      }
      
      return this.webllm;
    } catch (error) {
      console.error('💥 Failed to load WebLLM:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      throw new Error(`WebLLM library could not be loaded: ${error}`);
    }
  }

  async initializeEngine(modelId: string, progressCallback?: (status: string, progress: number) => void): Promise<void> {
    try {
      console.log('🚀 initializeEngine called with modelId:', modelId);
      
      if (this.engine && this.currentModelId === modelId) {
        console.log('✅ Model already loaded, skipping initialization');
        return;
      }

      if (this.engine) {
        console.log('🗑️ Unloading previous engine...');
        try {
          this.engine.unload();
          console.log('✅ Previous engine unloaded');
        } catch (e) {
          console.warn('⚠️ Error unloading previous engine:', e);
        }
      }

      console.log('📦 Setting initial loading status...');
      modelLoadingStatus.set('Loading WebLLM library...');
      modelLoadingProgress.set(0);
      
      if (progressCallback) {
        console.log('📞 Calling progress callback: Loading WebLLM library... 0%');
        progressCallback('Loading WebLLM library...', 0);
      }

      // Check if we're in a compatible environment
      if (typeof window === 'undefined') {
        console.error('❌ Not in browser environment');
        throw new Error('WebLLM requires a browser environment');
      }
      console.log('✅ Browser environment confirmed');

      // Load WebLLM dynamically
      console.log('📥 Loading WebLLM library...');
      const webllm = await this.loadWebLLM();
      console.log('✅ WebLLM library loaded');
      
      if (!webllm.MLCEngine) {
        console.error('❌ MLCEngine not found in WebLLM library');
        throw new Error('MLCEngine not available in WebLLM library');
      }
      console.log('✅ MLCEngine available in WebLLM library');
      
      console.log('🔄 Updating status: Initializing engine...');
      modelLoadingStatus.set('Initializing engine...');
      modelLoadingProgress.set(10);
      
      if (progressCallback) {
        console.log('📞 Calling progress callback: Initializing engine... 10%');
        progressCallback('Initializing engine...', 10);
      }

      // Create engine with error handling and WebGL fallback
      try {
        console.log('🏗️ Creating MLCEngine instance...');
        
        // Check browser capabilities
        const hasWebGPU = 'gpu' in navigator;
        const hasWebGL = !!document.createElement('canvas').getContext('webgl2');
        console.log('🔍 Browser capabilities:', { hasWebGPU, hasWebGL });
        
        if (!hasWebGPU && !hasWebGL) {
          throw new Error('Neither WebGPU nor WebGL2 is available. Please use a modern browser with hardware acceleration enabled.');
        }
        
        // For WebLLM 0.2.75, try different initialization approaches
        let engineCreated = false;
        let lastError = null;
        
        // Modern WebLLM should automatically fallback, but let's be explicit
        const initializationAttempts = [
          {
            name: 'Default (Auto-detect)',
            config: undefined,
            condition: true
          },
          {
            name: 'WebGL Explicit',
            config: { 
              initProgressCallback: undefined,
              logLevel: 'INFO'
            },
            condition: hasWebGL
          }
        ];
        
        for (const attempt of initializationAttempts) {
          if (!attempt.condition) continue;
          
          try {
            console.log(`🚀 Attempting ${attempt.name} initialization...`);
            if (attempt.config) {
              console.log('⚙️ Using config:', attempt.config);
              this.engine = new webllm.MLCEngine(attempt.config);
            } else {
              this.engine = new webllm.MLCEngine();
            }
            engineCreated = true;
            console.log(`✅ ${attempt.name} initialization successful`);
            break;
          } catch (initError) {
            console.warn(`⚠️ ${attempt.name} initialization failed:`, initError);
            lastError = initError;
            this.engine = null;
          }
        }
        
        if (!engineCreated) {
          // Provide specific guidance based on the error
          let helpfulError = `Failed to initialize WebLLM engine. `;
          if (lastError && lastError.message.includes('WebGPU')) {
            helpfulError += `WebGPU is not available. Please:\n\n1. Use Chrome 113+ or Edge 113+\n2. Enable WebGPU: chrome://flags/#enable-unsafe-webgpu\n3. Restart your browser\n4. Ensure hardware acceleration is enabled\n\nOriginal error: ${lastError.message}`;
          } else {
            helpfulError += `Last error: ${lastError}`;
          }
          throw new Error(helpfulError);
        }
        
        console.log('🎯 MLCEngine instance created, validating...');
        
        // Validate the engine was created properly
        if (!this.engine || typeof this.engine !== 'object') {
          console.error('❌ Engine validation failed - invalid engine object');
          throw new Error('Engine creation failed - invalid engine object');
        }
        console.log('✅ Engine object validation passed');
        
        if (!this.engine.reload || typeof this.engine.reload !== 'function') {
          console.error('❌ Engine validation failed - reload method not available');
          throw new Error('Engine creation failed - reload method not available');
        }
        console.log('✅ Engine reload method validation passed');
        
        console.log('🎉 MLCEngine created and validated successfully');
      } catch (engineError) {
        console.error('💥 Failed to create MLCEngine:', engineError);
        throw new Error(`Failed to create WebLLM engine: ${engineError}`);
      }
      
      this.currentModelId = modelId;
      console.log('📝 Set current model ID to:', modelId);

      // Update status
      console.log('🔄 Updating status: Loading model...');
      modelLoadingStatus.set('Loading model...');
      modelLoadingProgress.set(20);
      if (progressCallback) {
        console.log('📞 Calling progress callback: Loading model... 20%');
        progressCallback('Loading model...', 20);
      }

      // Set up progress callback for model loading
      if (this.engine.setInitProgressCallback) {
        console.log('📊 Setting up WebLLM progress callback...');
        this.engine.setInitProgressCallback((progress: any) => {
          console.log('📈 WebLLM internal progress:', {
            text: progress.text,
            progress: progress.progress,
            percentage: Math.round(progress.progress * 100)
          });
          const percentage = Math.round(progress.progress * 100);
          modelLoadingProgress.set(percentage);
          modelLoadingStatus.set(progress.text || 'Loading...');
          if (progressCallback) {
            progressCallback(progress.text || 'Loading...', percentage);
          }
        });
        console.log('✅ WebLLM progress callback set');
      } else {
        console.warn('⚠️ WebLLM engine does not support progress callbacks');
      }

      // Load the model with timeout
      try {
        console.log(`🎯 Starting model reload for: ${modelId}`);
        console.log('⏰ Beginning download/loading process...');
        console.log('📊 Checking network connectivity...');
        
        // Test network connectivity
        try {
          await fetch('https://httpbin.org/get', { 
            method: 'HEAD', 
            mode: 'no-cors',
            cache: 'no-cache'
          });
          console.log('✅ Network connectivity test passed');
        } catch (networkError) {
          console.warn('⚠️ Network connectivity test failed:', networkError);
        }
        
        // Validate reload method is still available
        if (!this.engine.reload || typeof this.engine.reload !== 'function') {
          console.error('❌ Engine reload method disappeared');
          throw new Error('Engine reload method is not available');
        }
        
        console.log('🔄 Calling engine.reload...');
        const startTime = Date.now();
        
        const loadPromise = this.engine.reload(modelId).then(() => {
          const duration = Date.now() - startTime;
          console.log(`✅ Model reload completed in ${duration}ms`);
        }).catch((loadError) => {
          const duration = Date.now() - startTime;
          console.error(`💥 Model reload failed after ${duration}ms:`, loadError);
          console.error('🔍 Reload error details:', {
            message: loadError instanceof Error ? loadError.message : 'Unknown error',
            stack: loadError instanceof Error ? loadError.stack : 'No stack trace',
            name: loadError instanceof Error ? loadError.name : 'Unknown error type',
            modelId,
            duration
          });
          throw loadError;
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            console.error('⏰ Model loading timed out after 5 minutes');
            reject(new Error('Model loading timed out after 5 minutes'));
          }, 300000) // 5 minutes
        );
        
        console.log('⏳ Waiting for model loading to complete (5 min timeout)...');
        await Promise.race([loadPromise, timeoutPromise]);
        console.log('🎉 Model loaded successfully!');
      } catch (reloadError) {
        console.error('💥 Failed to reload model:', reloadError);
        
        // Additional error context
        console.error('🔍 Additional error context:', {
          engineExists: !!this.engine,
          modelId,
          currentModelId: this.currentModelId,
          webllmExists: !!this.webllm,
          timestamp: new Date().toISOString()
        });
        
        throw new Error(`Model loading failed: ${reloadError}`);
      }

      // Complete
      console.log('🏁 Finalizing model loading...');
      modelLoadingStatus.set('Model loaded successfully!');
      modelLoadingProgress.set(100);
      setModelDownloaded(modelId);
      isModelLoaded.set(true);
      currentModel.set(modelId);
      
      if (progressCallback) {
        console.log('📞 Final progress callback: Model loaded successfully! 100%');
        progressCallback('Model loaded successfully!', 100);
      }
      console.log('✅ Model initialization complete');
    } catch (error) {
      console.error('💥 Failed to initialize WebLLM engine:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type',
        modelId
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      modelLoadingStatus.set(`Error: ${errorMessage}`);
      setModelDownloadError(modelId, errorMessage);
      isModelLoaded.set(false);
      throw error;
    }
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    onUpdate?: (content: string, isComplete?: boolean) => void
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    // Validate engine has the required methods
    if (!this.engine.chat || typeof this.engine.chat !== 'object') {
      throw new Error('Engine chat interface not available');
    }

    if (!this.engine.chat.completions || typeof this.engine.chat.completions !== 'object') {
      throw new Error('Engine completions interface not available');
    }

    if (!this.engine.chat.completions.create || typeof this.engine.chat.completions.create !== 'function') {
      throw new Error('Engine create method not available');
    }

    try {
      let fullResponse = '';
      
      console.log('Creating chat completion...');
      const completion = await this.engine.chat.completions.create({
        messages: messages as any,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024
      });

      // Validate completion is iterable
      if (!completion || typeof completion[Symbol.asyncIterator] !== 'function') {
        throw new Error('Completion is not async iterable');
      }

      for await (const chunk of completion) {
        if (chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
          const delta = chunk.choices[0].delta.content || '';
          fullResponse += delta;
          if (onUpdate && typeof onUpdate === 'function') {
            onUpdate(fullResponse, false); // Not complete yet
          }
        }
      }

      // Final update to mark completion
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate(fullResponse, true); // Mark as complete
      }

      return fullResponse;
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  async isModelAvailable(modelId: string): Promise<boolean> {
    try {
      const webllm = await this.loadWebLLM();
      return await webllm.hasModelInCache(modelId);
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const webllm = await this.loadWebLLM();
      return webllm.prebuiltAppConfig.model_list.map((model: any) => model.model_id);
    } catch {
      return [];
    }
  }

  unload(): void {
    if (this.engine) {
      this.engine.unload();
      this.engine = null;
      this.currentModelId = '';
      isModelLoaded.set(false);
    }
  }
}

export const webLLMService = new WebLLMService();

export async function switchModel(modelId: string, progressCallback?: (status: string, progress: number) => void): Promise<void> {
  await webLLMService.initializeEngine(modelId, progressCallback);
}

export async function generateChatResponse(
  messages: Array<{ role: string; content: string }>,
  onUpdate?: (content: string, isComplete?: boolean) => void
): Promise<string> {
  const modelId = get(currentModel);
  const loaded = get(isModelLoaded);
  
  if (!loaded) {
    await webLLMService.initializeEngine(modelId);
  }
  
  return await webLLMService.generateResponse(messages, onUpdate);
}