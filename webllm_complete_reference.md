# WebLLM Complete Reference Documentation

## Project Overview

WebLLM is a high-performance in-browser LLM inference engine that brings language model inference directly onto web browsers with hardware acceleration. Everything runs inside the browser with no server support and is accelerated with WebGPU.

**Key Features:**

- **In-Browser Inference**: WebGPU hardware acceleration for powerful LLM operations directly within web browsers
- **Full OpenAI API Compatibility**: Seamless integration using OpenAI API with streaming, JSON-mode, function-calling, etc.
- **Structured JSON Generation**: State-of-the-art JSON mode generation implemented in WebAssembly
- **Extensive Model Support**: Llama 3, Phi 3, Gemma, Mistral, Qwen, and many others
- **Custom Model Integration**: Deploy custom models in MLC format
- **Web Worker & Service Worker Support**: Optimize UI performance with separate worker threads
- **Chrome Extension Support**: Build browser extensions with WebLLM

## Installation

### NPM Installation

```bash
# npm
npm install @mlc-ai/web-llm

# yarn
yarn add @mlc-ai/web-llm

# pnpm
pnpm install @mlc-ai/web-llm
```

### CDN Import

```javascript
// Import everything
import * as webllm from 'https://esm.run/@mlc-ai/web-llm';

// Dynamic import
const webllm = await import('https://esm.run/@mlc-ai/web-llm');
```

## Core API Reference

### MLCEngine Interface

The MLCEngine class is the core interface of WebLLM enabling model loading, chat completions, embeddings, and other operations.

#### Configuration Interfaces

**MLCEngineConfig** - Optional configurations for `CreateMLCEngine()` and `CreateWebWorkerMLCEngine()`:

```typescript
interface MLCEngineConfig {
  appConfig?: AppConfig;
  initProgressCallback?: InitProgressCallback;
  logitProcessorRegistry?: Map<string, LogitProcessor>;
}
```

**GenerationConfig** - Configurations for generation tasks:

```typescript
interface GenerationConfig {
  // MLC-specific fields
  repetition_penalty?: number;
  ignore_eos?: boolean;

  // Shared with OpenAI APIs
  top_p?: number | null;
  temperature?: number | null;
  max_tokens?: number | null;
  frequency_penalty?: number | null;
  presence_penalty?: number | null;
  stop?: string | null | Array<string>;
  n?: number | null;
  logit_bias?: Record<string, number> | null;
  logprobs?: boolean | null;
  top_logprobs?: number | null;
  response_format?: ResponseFormat | null;
  enable_thinking?: boolean | null;
}
```

### Creating an MLCEngine

**Method 1: Factory Function**

```javascript
import { CreateMLCEngine } from '@mlc-ai/web-llm';

const initProgressCallback = (initProgress) => {
  console.log(initProgress);
};

const selectedModel = 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
const engine = await CreateMLCEngine(
  selectedModel,
  { initProgressCallback: initProgressCallback },
  {
    context_window_size: 2048
    // sliding_window_size: 1024,
    // attention_sink_size: 4,
  }
);
```

**Method 2: Direct Instantiation**

```javascript
import { MLCEngine } from '@mlc-ai/web-llm';

// Synchronous call
const engine = new MLCEngine({
  initProgressCallback: initProgressCallback
});

// Asynchronous model loading
await engine.reload(selectedModel);
```

### Chat Completions

**Basic Chat Completion**

```javascript
const messages = [
  { role: 'system', content: 'You are a helpful AI assistant.' },
  { role: 'user', content: 'Hello!' }
];

const reply = await engine.chat.completions.create({
  messages
});

console.log(reply.choices[0].message);
console.log(reply.usage);
```

**Streaming Chat Completion**

```javascript
const messages = [
  { role: 'system', content: 'You are a helpful AI assistant.' },
  { role: 'user', content: 'Hello!' }
];

// Enable streaming
const chunks = await engine.chat.completions.create({
  messages,
  temperature: 1,
  stream: true,
  stream_options: { include_usage: true }
});

let reply = '';
for await (const chunk of chunks) {
  reply += chunk.choices[0]?.delta.content || '';
  console.log(reply);
  if (chunk.usage) {
    console.log(chunk.usage); // only last chunk has usage
  }
}

const fullReply = await engine.getMessage();
console.log(fullReply);
```

### Model Configuration

**ChatConfig Interface**

```typescript
interface ChatConfig {
  tokenizer_files: Array<string>;
  tokenizer_info?: TokenizerInfo;
  vocab_size: number;
  conv_config?: Partial<ConvTemplateConfig>;
  conv_template: ConvTemplateConfig;

  // KVCache settings
  context_window_size: number;
  sliding_window_size: number;
  attention_sink_size: number;

  // Generation parameters
  repetition_penalty: number;
  frequency_penalty: number;
  presence_penalty: number;
  top_p: number;
  temperature: number;
  bos_token_id?: number;
}
```

**ModelRecord Interface**

```typescript
interface ModelRecord {
  model: string;
  model_id: string;
  model_lib: string;
  overrides?: ChatOptions;
  vram_required_MB?: number;
  low_resource_required?: boolean;
  buffer_size_required_bytes?: number;
  required_features?: Array<string>;
  model_type?: ModelType;
}
```

### Conversation Template Configuration

```typescript
interface ConvTemplateConfig {
  system_template: string;
  system_message: string;
  roles: Record<Role, string>;
  role_templates?: Partial<Record<Role, string>>;
  seps: Array<string>;
  role_content_sep?: string;
  role_empty_sep?: string;
  stop_str: Array<string>;
  system_prefix_token_ids?: Array<number>;
  stop_token_ids: Array<number>;
  add_role_after_system_message?: boolean;
}

enum Role {
  user = 'user',
  assistant = 'assistant',
  tool = 'tool'
}
```

## Web Worker Integration

### Web Worker Handler

```javascript
// worker.ts
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
```

### Main Thread Implementation

```javascript
// main.ts
import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';

async function main() {
  const engine = await CreateWebWorkerMLCEngine(
    new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
    selectedModel,
    { initProgressCallback }
  );

  // Same API as MLCEngine
}
```

## Service Worker Integration

### Service Worker Handler

```javascript
// sw.ts
import { ServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: ServiceWorkerMLCEngineHandler;

self.addEventListener("activate", function (event) {
  handler = new ServiceWorkerMLCEngineHandler();
  console.log("Service Worker is ready");
});
```

### Main Thread Registration

```javascript
// main.ts
import { MLCEngineInterface, CreateServiceWorkerMLCEngine } from "@mlc-ai/web-llm";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(
    new URL("sw.ts", import.meta.url),
    { type: "module" }
  );
}

const engine: MLCEngineInterface = await CreateServiceWorkerMLCEngine(
  selectedModel,
  { initProgressCallback }
);
```

## Advanced Features

### JSON Mode and Schema

**Basic JSON Schema**

```javascript
const schema1 = `{
  "properties": {
    "size": {"title": "Size", "type": "integer"}, 
    "is_accepted": {"title": "Is Accepted", "type": "boolean"}, 
    "num": {"title": "Num", "type": "number"}
  },
  "required": ["size", "is_accepted", "num"], 
  "title": "Schema", "type": "object"
}`;

const request = {
  stream: false,
  messages: [
    {
      role: 'user',
      content:
        'Generate a json containing three fields: an integer field named size, a boolean field named is_accepted, and a float field named num.'
    }
  ],
  max_tokens: 128,
  response_format: {
    type: 'json_object',
    schema: schema1
  }
};

const reply = await engine.chat.completions.create(request);
```

**TypeBox Schema Integration**

```javascript
import { Type, Static } from "@sinclair/typebox";

const T = Type.Object({
  size: Type.Integer(),
  is_accepted: Type.Boolean(),
  num: Type.Number(),
});

type T = Static<typeof T>;
const schema2 = JSON.stringify(T);
```

### EBNF Grammar Support

```javascript
const jsonGrammarStr = String.raw`
root ::= basic_array | basic_object
basic_any ::= basic_number | basic_string | basic_boolean | basic_null | basic_array | basic_object
basic_integer ::= ("0" | "-"? [1-9] [0-9]*) ".0"?
basic_number ::= ("0" | "-"? [1-9] [0-9]*) ("." [0-9]+)? ([eE] [+-]? [0-9]+)?
basic_string ::= (([\"] basic_string_1 [\"]))
`;

const request = {
  messages: [
    {
      role: 'user',
      content: 'Generate a JSON object with a name and age field.'
    }
  ],
  response_format: {
    type: 'grammar',
    grammar: jsonGrammarStr
  }
};
```

### Custom Model Integration

**Adding Custom Models**

```javascript
const appConfig = {
  model_list: [
    {
      model: '/url/to/my/llama',
      model_id: 'MyLlama-3b-v1-q4f32_0',
      model_lib: '/url/to/myllama3b.wasm'
    }
  ]
};

const chatOpts = {
  repetition_penalty: 1.01
};

const engine = await CreateMLCEngine('MyLlama-3b-v1-q4f32_0', { appConfig }, chatOpts);
```

## Built-in Models

WebLLM supports a wide range of pre-built models:

### Model Families

- **Llama**: Llama 3, Llama 2, Hermes-2-Pro-Llama-3
- **Phi**: Phi 3, Phi 2, Phi 1.5
- **Gemma**: Gemma-2B
- **Mistral**: Mistral-7B-v0.3, Hermes-2-Pro-Mistral-7B, NeuralHermes-2.5-Mistral-7B, OpenHermes-2.5-Mistral-7B
- **Qwen**: Qwen2 0.5B, 1.5B, 7B

### Model Access

```javascript
// Access available models
const modelList = webllm.prebuiltAppConfig.model_list;

// Use predefined model
const selectedModel = 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
const engine = await CreateMLCEngine(selectedModel);
```

## Utility Methods

### GPU Information

```javascript
// Get GPU vendor
const gpuVendor = await engine.getGPUVendor();
console.log(`GPU Vendor: ${gpuVendor}`);

// Get max storage buffer size
const maxBufferSize = await engine.getMaxStorageBufferBindingSize();
console.log(`Max Storage Buffer Binding Size: ${maxBufferSize}`);
```

### Chat Management

```javascript
// Get current message
const currentMessage = await engine.getMessage();

// Reset chat (optionally keep stats)
await engine.resetChat(true); // keepStats = true
```

### Model Management

```javascript
// Load multiple models
await engine.reload(['Llama-3.1-8B', 'Gemma-2B'], [{ temperature: 0.7 }, { top_p: 0.9 }]);

// Unload all models
await engine.unload();
```

## Example Projects

### Get Started Example

```javascript
import * as webllm from "@mlc-ai/web-llm";

function setLabel(id: string, text: string) {
  const label = document.getElementById(id);
  if (label == null) {
    throw Error("Cannot find label " + id);
  }
  label.innerText = text;
}

async function main() {
  const initProgressCallback = (report: webllm.InitProgressReport) => {
    setLabel("init-label", report.text);
  };

  const selectedModel = "Llama-3.1-8B-Instruct-q4f32_1-MLC";
  const engine: webllm.MLCEngineInterface = await webllm.CreateMLCEngine(
    selectedModel,
    {
      initProgressCallback: initProgressCallback,
      logLevel: "INFO",
    },
    {
      context_window_size: 2048,
    },
  );

  const messages = [
    {
      role: "system",
      content: "You are a helpful AI assistant.",
    },
    {
      role: "user",
      content: "What is the meaning of life?"
    },
  ];

  const reply = await engine.chat.completions.create({
    messages,
  });

  console.log(reply.choices[0].message.content);
  setLabel("generate-label", reply.choices[0].message.content);
}

main();
```

### Multi-Model Example

```javascript
const appConfig = {
  model_list: [
    {
      model: 'https://huggingface.co/mlc-ai/Llama-3-8B-Instruct-q4f32_1-MLC',
      model_id: 'Llama-3-8B-Instruct-q4f32_1-MLC',
      model_lib:
        webllm.modelLibURLPrefix +
        webllm.modelVersion +
        '/Llama-3-8B-Instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm'
    },
    {
      model: 'https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC',
      model_id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
      model_lib:
        webllm.modelLibURLPrefix +
        webllm.modelVersion +
        '/Phi-3-mini-4k-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
    }
  ]
};

const engine = await CreateMLCEngine(
  ['Llama-3-8B-Instruct-q4f32_1-MLC', 'Phi-3-mini-4k-instruct-q4f16_1-MLC'],
  { appConfig }
);
```

## Error Handling & Troubleshooting

### Common Issues

**WebGPU Compatibility**

```javascript
// Check WebGPU support
if (!navigator.gpu) {
  console.error('WebGPU is not supported in this browser');
}

// GPU limits
try {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  console.log('WebGPU device created successfully');
} catch (error) {
  console.error('Failed to create WebGPU device:', error);
}
```

**Memory Limitations**

```javascript
// Check storage buffer limits
const maxBufferSize = await engine.getMaxStorageBufferBindingSize();
if (maxBufferSize < 32768) {
  console.warn('GPU may have limited storage buffer size');
}
```

**Model Loading Errors**

```javascript
try {
  await engine.reload(modelId);
} catch (error) {
  if (error.message.includes('maxComputeWorkgroupStorageSize')) {
    console.error('GPU compute limits exceeded. Try a smaller model.');
  } else if (error.message.includes('network')) {
    console.error('Network error loading model. Check connection.');
  }
}
```

## Build Configuration

### Package.json Dependencies

```json
{
  "name": "@mlc-ai/web-llm",
  "dependencies": {
    "@mlc-ai/web-runtime": "0.18.0-dev2",
    "loglevel": "^1.8.1"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^5.62.0",
    "@typescript-eslint/parser": "^5.62.0",
    "eslint": "^8.45.0",
    "jest": "^29.7.0",
    "rollup": "^3.29.4",
    "rollup-plugin-typescript2": "^0.36.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.1.6"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "examples"]
}
```

### Building from Source

**Prerequisites**

```bash
# Install emscripten
./emsdk install 3.1.56
source ./emsdk_env.sh

# Prepare dependencies
./scripts/prep_deps.sh

# Build WebLLM
npm install
npm run build
```

**Development Setup**

```bash
# Link local development version
cd examples/get-started
# Change package.json dependency to "file:../.."
npm install
npm start
```

## Performance Optimization

### Context Window Configuration

```javascript
const engine = await CreateMLCEngine(
  selectedModel,
  { initProgressCallback },
  {
    context_window_size: 2048, // Reduce for memory savings
    sliding_window_size: 1024, // Use sliding window
    attention_sink_size: 4 // Attention sink tokens
  }
);
```

### Worker Thread Usage

```javascript
// Offload to web worker for better UI performance
const engine = await CreateWebWorkerMLCEngine(
  new Worker('./worker.js', { type: 'module' }),
  selectedModel,
  { initProgressCallback }
);
```

### Caching Strategy

```javascript
const appConfig = {
  use_web_worker: true,
  useIndexedDBCache: true // Cache models in IndexedDB
};
```

## OpenAI API Compatibility

### Supported Features

- **Streaming**: Real-time token generation
- **JSON Mode**: Structured output generation
- **Function Calling**: Tool integration (WIP)
- **Logit Bias**: Token probability control
- **Seed Control**: Reproducible outputs
- **Temperature/Top-p**: Generation control

### API Mapping

```javascript
// OpenAI-style usage
const response = await engine.chat.completions.create({
  model: 'gpt-3.5-turbo', // Ignored - model set at engine level
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  max_tokens: 100,
  stream: false,
  seed: 42,
  logit_bias: { 1234: -100 } // Suppress specific tokens
});
```

## License & Attribution

This project is licensed under the Apache License 2.0. WebLLM is built on the Apache TVM stack and relies on the broader open-source ML ecosystem.

### Citation

```bibtex
@misc{ruan2024webllmhighperformanceinbrowserllm,
  title={WebLLM: A High-Performance In-Browser LLM Inference Engine},
  author={Charlie F. Ruan and Yucheng Qin and Xun Zhou and Ruihang Lai and Hongyi Jin and Yixin Dong and Bohan Hou and Meng-Shiun Yu and Yiyan Zhai and Sudeep Agarwal and Hangrui Cao and Siyuan Feng and Tianqi Chen},
  year={2024},
  eprint={2412.15803},
  archivePrefix={arXiv},
  primaryClass={cs.LG},
  url={https://arxiv.org/abs/2412.15803},
}
```

## Related Projects

- **[MLC LLM](https://github.com/mlc-ai/mlc-llm)**: Universal LLM deployment across hardware
- **[WebLLM Chat](https://github.com/mlc-ai/web-llm-chat)**: Full-featured chat application
- **[Web Stable Diffusion](https://github.com/mlc-ai/web-stable-diffusion)**: Browser-based image generation

---

_This documentation covers WebLLM version 0.2.79 and provides a comprehensive reference for building AI-powered web applications with in-browser LLM inference._
