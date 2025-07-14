import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.js'],
    plugins: {
      '@typescript-eslint': ts
    },
    rules: {
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },
  {
    files: ['**/*.svelte'],
    plugins: {
      svelte: svelte
    },
    rules: {
      ...svelte.configs.recommended.rules
    }
  }
];