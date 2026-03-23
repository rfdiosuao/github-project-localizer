import { LLMAdapter, LLMMessage, LLMOptions, LLMResponse } from './base.js';

// 默认超时时间
const DEFAULT_TIMEOUT = 60000;

export class ClaudeAdapter extends LLMAdapter {
  name = 'Claude';
  models = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'];

  private apiKey: string;
  private defaultModel: string;

  constructor(config: { apiKey: string; defaultModel?: string }) {
    super();
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-6';
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const timeout = options?.timeout || DEFAULT_TIMEOUT;

    // Claude API需要分离system消息
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const requestPromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    const response = await this.withTimeout(requestPromise, timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }
}