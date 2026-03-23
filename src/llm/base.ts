/**
 * LLM适配器基类
 * 所有模型适配器必须继承此类
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeout?: number; // 毫秒
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 默认超时时间
const DEFAULT_TIMEOUT = 60000; // 60秒

export abstract class LLMAdapter {
  abstract name: string;
  abstract models: string[];

  abstract chat(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * 带超时的请求包装
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = DEFAULT_TIMEOUT
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  async translate(
    text: string,
    context: string,
    systemPrompt: string,
    timeout?: number
  ): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `上下文：${context}\n\n需要翻译的文本：\n${text}` }
    ], { temperature: 0.3, timeout });
    return response.content;
  }

  async batchTranslate(
    items: { text: string; context: string }[],
    systemPrompt: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> {
    const results: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const result = await this.translate(items[i].text, items[i].context, systemPrompt);
      results.push(result);
      onProgress?.(i + 1, items.length);
    }
    return results;
  }
}