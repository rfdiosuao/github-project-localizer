import { LLMAdapter, LLMMessage, LLMOptions, LLMResponse } from './base.js';
import { OpenAIAdapter } from './openai.js';

/**
 * DeepSeek适配器
 * API兼容OpenAI格式
 */
export class DeepSeekAdapter extends OpenAIAdapter {
  name = 'DeepSeek';
  models = ['deepseek-chat', 'deepseek-coder'];

  constructor(config: { apiKey: string; baseUrl?: string; defaultModel?: string }) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.deepseek.com/v1',
      defaultModel: config.defaultModel || 'deepseek-chat'
    });
  }
}