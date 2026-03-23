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
        batch.map(text => this.translateText(text))
      );

      results.push(...batchResults);

      // 避免API限流
      if (i < batches.length - 1) {
        await this.delay(100);
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

  private async translateText(text: ExtractedText): Promise<TranslationResult> {
    try {
      const systemPrompt = this.getSystemPromptForType(text.type);
      const translated = await this.llm.translate(
        text.text,
        text.context,
        systemPrompt
      );

      return {
        original: text.text,
        translated: translated.trim(),
        status: 'success'
      };
    } catch (error) {
      return {
        original: text.text,
        translated: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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