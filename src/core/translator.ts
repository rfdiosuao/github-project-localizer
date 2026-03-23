import { LLMAdapter } from '../llm/base.js';
import { getSystemPrompt } from '../prompts/index.js';
import { ExtractedText } from './extractor.js';

export interface TranslationResult {
  original: string;
  translated: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

export interface TranslationProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'extracting' | 'translating' | 'generating' | 'complete';
}

export type ProgressCallback = (progress: TranslationProgress) => void;

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,  // 1秒
  maxDelay: 10000,     // 10秒
  backoffMultiplier: 2
};

// 占位符模式
const PLACEHOLDER_PATTERNS = [
  /\{[^}]+\}/g,           // {name}, {value}
  /\{\{[^}]+\}\}/g,       // {{name}}
  /%[sdifjo]/g,           // %s, %d, etc.
  /\$\{[^}]+\}/g,         // ${name}
  /<[^>]+>/g              // <tag>
];

export class Translator {
  private llm: LLMAdapter;
  private onProgress?: ProgressCallback;

  constructor(llm: LLMAdapter, onProgress?: ProgressCallback) {
    this.llm = llm;
    this.onProgress = onProgress;
  }

  async translateTexts(
    texts: ExtractedText[],
    batchSize: number = 10
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    const batches = this.createBatches(texts, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.onProgress?.({
        current: i * batchSize,
        total: texts.length,
        currentFile: '',
        status: 'translating'
      });

      const batchResults = await Promise.all(
        batch.map(text => this.translateTextWithRetry(text))
      );

      results.push(...batchResults);

      // 避免API限流
      if (i < batches.length - 1) {
        await this.delay(200);
      }
    }

    this.onProgress?.({
      current: texts.length,
      total: texts.length,
      currentFile: '',
      status: 'complete'
    });

    return results;
  }

  /**
   * 带重试的翻译
   */
  private async translateTextWithRetry(text: ExtractedText): Promise<TranslationResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const systemPrompt = this.getSystemPromptForType(text.type);
        const translated = await this.llm.translate(
          text.text,
          text.context,
          systemPrompt
        );

        // 验证翻译结果
        const validation = this.validateTranslation(text.text, translated);

        if (!validation.valid) {
          return {
            original: text.text,
            translated: '',
            status: 'failed',
            error: validation.reason
          };
        }

        return {
          original: text.text,
          translated: translated.trim(),
          status: 'success'
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // 不可重试的错误直接返回
        if (this.isNonRetriableError(lastError)) {
          break;
        }

        // 指数退避重试
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
            RETRY_CONFIG.maxDelay
          );
          await this.delay(delay);
        }
      }
    }

    return {
      original: text.text,
      translated: '',
      status: 'failed',
      error: lastError?.message || 'Translation failed after retries'
    };
  }

  /**
   * 验证翻译结果
   */
  private validateTranslation(original: string, translated: string): { valid: boolean; reason?: string } {
    // 检查空结果
    if (!translated || !translated.trim()) {
      return { valid: false, reason: 'Empty translation result' };
    }

    // 检查占位符是否保留
    for (const pattern of PLACEHOLDER_PATTERNS) {
      const originalPlaceholders = original.match(pattern) || [];
      const translatedPlaceholders = translated.match(pattern) || [];

      if (originalPlaceholders.length !== translatedPlaceholders.length) {
        return {
          valid: false,
          reason: `Placeholder mismatch: expected ${originalPlaceholders.length}, got ${translatedPlaceholders.length}`
        };
      }

      // 检查每个占位符是否保留
      for (const placeholder of originalPlaceholders) {
        if (!translated.includes(placeholder)) {
          return {
            valid: false,
            reason: `Placeholder lost: ${placeholder}`
          };
        }
      }
    }

    // 检查是否翻译成了中文（至少包含一些中文字符或保持原样）
    const hasChinese = /[\u4e00-\u9fa5]/.test(translated);
    const isUnchanged = original === translated.trim();

    if (!hasChinese && !isUnchanged) {
      // 没有中文且发生了变化，可能是翻译成了其他语言
      return { valid: false, reason: 'Translation does not appear to be Chinese' };
    }

    return { valid: true };
  }

  /**
   * 判断是否为不可重试的错误
   */
  private isNonRetriableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // 认证错误、配额错误不重试
    if (message.includes('unauthorized') ||
        message.includes('invalid api key') ||
        message.includes('quota exceeded') ||
        message.includes('billing')) {
      return true;
    }

    return false;
  }

  private getSystemPromptForType(type: string): string {
    switch (type) {
      case 'string':
        return getSystemPrompt('ui');
      case 'comment':
        return getSystemPrompt('comment');
      case 'markdown':
        return getSystemPrompt('markdown');
      case 'json-value':
        return getSystemPrompt('json');
      default:
        return getSystemPrompt('default');
    }
  }

  private createBatches<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}