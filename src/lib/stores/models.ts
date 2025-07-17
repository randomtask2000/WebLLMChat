import { writable } from 'svelte/store';
import type { ModelInfo, ModelDownloadProgress } from '../types';

export const availableModels = writable<ModelInfo[]>([]);
export const downloadProgress = writable<Record<string, ModelDownloadProgress>>({});
export const currentModel = writable<string>('TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC');
export const isModelLoaded = writable(false);
export const modelLoadingProgress = writable<number>(0);
export const modelLoadingStatus = writable<string>('');

export const MODELS: ModelInfo[] = [
  // Lightweight/Fast Models
  {
    model_id: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC',
    vram_required_MB: 512,
    low_resource_required: true,
    description: '⚡ Fastest loading, minimal VRAM - Perfect for testing',
    context_length: 2048
  },
  {
    model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    vram_required_MB: 1024,
    low_resource_required: true,
    description: '🚀 Llama 3.2 1B - Good balance of speed and quality',
    context_length: 131072
  },
  {
    model_id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    vram_required_MB: 2048,
    low_resource_required: false,
    description: '⚡ Microsoft Phi 3.5 Mini - Efficient and capable',
    context_length: 131072
  },

  // Mid-Range Models
  {
    model_id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    vram_required_MB: 2048,
    low_resource_required: false,
    description: '🦙 Llama 3.2 3B - Great for general conversations',
    context_length: 131072
  },
  {
    model_id: 'Llama-3.2-3B-Instruct-q4f16_1-1k-MLC',
    vram_required_MB: 2048,
    low_resource_required: false,
    description: '🦙 Llama 3.2 3B with 1M context - Extended conversations',
    context_length: 1048576
  },
  {
    model_id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    vram_required_MB: 2048,
    low_resource_required: false,
    description: '🧠 Qwen 2.5 3B - Excellent reasoning and coding',
    context_length: 131072
  },

  // Large Models
  {
    model_id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    vram_required_MB: 4096,
    low_resource_required: false,
    description: '💎 Qwen 2.5 7B - Top-tier for coding and analysis',
    context_length: 131072
  },
  {
    model_id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    vram_required_MB: 5120,
    low_resource_required: false,
    description: '🦙 Llama 3.1 8B - Highest quality responses',
    context_length: 131072
  },
  {
    model_id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    vram_required_MB: 4096,
    low_resource_required: false,
    description: '🌪️ Mistral 7B - Strong multilingual capabilities',
    context_length: 32768
  },

  // Code-Specialized Models
  {
    model_id: 'CodeLlama-7b-Instruct-hf-q4f16_1-MLC',
    vram_required_MB: 4096,
    low_resource_required: false,
    description: '💻 CodeLlama 7B - Specialized for programming',
    context_length: 16384
  },
  {
    model_id: 'CodeQwen1.5-7B-Chat-q4f16_1-MLC',
    vram_required_MB: 4096,
    low_resource_required: false,
    description: '💻 CodeQwen 7B - Advanced code generation',
    context_length: 65536
  },

  // Math & Reasoning Models
  {
    model_id: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC',
    vram_required_MB: 4096,
    low_resource_required: false,
    description: '🧠 Hermes 2 Pro - Enhanced reasoning and logic',
    context_length: 8192
  },
  {
    model_id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    vram_required_MB: 5120,
    low_resource_required: false,
    description: '🌟 Hermes 3 - Advanced reasoning with Llama 3.1',
    context_length: 131072
  },

  // Conversational Models
  {
    model_id: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
    vram_required_MB: 2048,
    low_resource_required: false,
    description: '💬 Hermes 3 3B - Excellent conversational AI',
    context_length: 131072
  },
  {
    model_id: 'WizardMath-7B-V1.1-q4f16_1-MLC',
    vram_required_MB: 4096,
    low_resource_required: false,
    description: '🧙 WizardMath - Mathematical problem solving',
    context_length: 2048
  }
];

availableModels.set(MODELS);

export function setModelDownloadProgress(
  modelId: string,
  progress: number,
  downloading: boolean = true
) {
  downloadProgress.update((state) => ({
    ...state,
    [modelId]: {
      modelId,
      progress,
      downloading,
      downloaded: progress >= 100,
      error: undefined
    }
  }));
}

export function setModelDownloadError(modelId: string, error: string) {
  downloadProgress.update((state) => ({
    ...state,
    [modelId]: {
      modelId,
      progress: 0,
      downloading: false,
      downloaded: false,
      error
    }
  }));
}

export function setModelDownloaded(modelId: string) {
  downloadProgress.update((state) => ({
    ...state,
    [modelId]: {
      modelId,
      progress: 100,
      downloading: false,
      downloaded: true,
      error: undefined
    }
  }));
}
