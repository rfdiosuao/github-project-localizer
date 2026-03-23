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
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class LLMAdapter {
  abstract name: string;
  abstract models: string[];

  abstract chat(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse>;

  async translate(
    text: string,
    context: string,
    systemPrompt: string
  ): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `上下文：${context}\n\n需要翻译的文本：\n${text}` }
    ], { temperature: 0.3 });
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