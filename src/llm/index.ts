import { LLMAdapter } from './base.js';
import type { LLMMessage, LLMOptions, LLMResponse } from './base.js';
import { OpenAIAdapter } from './openai.js';
import { ClaudeAdapter } from './claude.js';
import { DeepSeekAdapter } from './deepseek.js';

export type { LLMAdapter, LLMMessage, LLMOptions, LLMResponse };

export type LLMProvider = 'openai' | 'claude' | 'deepseek' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

let llmInstance: LLMAdapter | null = null;

export function createLLM(config: LLMConfig): LLMAdapter {
  switch (config.provider) {
    case 'openai':
      return new OpenAIAdapter({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
        baseUrl: config.baseUrl || process.env.OPENAI_BASE_URL,
        defaultModel: config.model
      });

    case 'claude':
      return new ClaudeAdapter({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
        defaultModel: config.model
      });

    case 'deepseek':
      return new DeepSeekAdapter({
        apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY || '',
        baseUrl: config.baseUrl || process.env.DEEPSEEK_BASE_URL,
        defaultModel: config.model
      });

    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

export function getLLM(config?: LLMConfig): LLMAdapter {
  if (!llmInstance || config) {
    llmInstance = createLLM(config || {
      provider: (process.env.DEFAULT_MODEL as LLMProvider) || 'openai'
    });
  }
  return llmInstance;
}

export function resetLLM(): void {
  llmInstance = null;
}