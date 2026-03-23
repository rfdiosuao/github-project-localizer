import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Translator } from '../src/core/translator.js';
import { LLMAdapter, LLMResponse } from '../src/llm/base.js';
import { ExtractedText } from '../src/core/extractor.js';

// Mock LLM Adapter
class MockLLMAdapter extends LLMAdapter {
  name = 'MockLLM';
  models = ['mock-model'];

  private shouldFail = false;
  private failCount = 0;
  private callCount = 0;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setFailCount(count: number) {
    this.failCount = count;
  }

  getCallCount() {
    return this.callCount;
  }

  reset() {
    this.callCount = 0;
    this.shouldFail = false;
    this.failCount = 0;
  }

  async chat(): Promise<LLMResponse> {
    this.callCount++;

    if (this.shouldFail || (this.failCount > 0 && this.callCount <= this.failCount)) {
      throw new Error('Mock API error');
    }

    return {
      content: '这是翻译后的文本',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    };
  }
}

describe('Translator', () => {
  let translator: Translator;
  let mockLLM: MockLLMAdapter;
  let progressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLLM = new MockLLMAdapter();
    progressCallback = vi.fn();
    translator = new Translator(mockLLM, progressCallback);
  });

  describe('translateTexts', () => {
    it('should translate texts successfully', async () => {
      const texts: ExtractedText[] = [
        {
          id: '1',
          text: 'Hello World',
          context: '',
          location: { file: 'test.ts', line: 1 },
          type: 'string'
        }
      ];

      const results = await translator.translateTexts(texts);

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('success');
      expect(results[0].translated).toBe('这是翻译后的文本');
    });

    it('should call progress callback', async () => {
      const texts: ExtractedText[] = [
        { id: '1', text: 'Text 1', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' },
        { id: '2', text: 'Text 2', context: '', location: { file: 'test.ts', line: 2 }, type: 'string' }
      ];

      await translator.translateTexts(texts);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle multiple texts', async () => {
      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' },
        { id: '2', text: 'World', context: '', location: { file: 'test.ts', line: 2 }, type: 'string' },
        { id: '3', text: 'Test', context: '', location: { file: 'test.ts', line: 3 }, type: 'string' }
      ];

      const results = await translator.translateTexts(texts);

      expect(results.length).toBe(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on failure', async () => {
      mockLLM.setFailCount(2); // 前2次失败

      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      const results = await translator.translateTexts(texts);

      // 第3次成功
      expect(results[0].status).toBe('success');
      expect(mockLLM.getCallCount()).toBe(3);
    });

    it('should fail after max retries', async () => {
      mockLLM.setShouldFail(true);

      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      const results = await translator.translateTexts(texts);

      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBeTruthy();
    }, 30000);
  });

  describe('validation', () => {
    it('should fail on empty translation', async () => {
      // 重写 chat 返回空字符串
      const emptyMock = new class extends LLMAdapter {
        name = 'EmptyMock';
        models = ['mock'];
        async chat(): Promise<LLMResponse> {
          return { content: '', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }();

      const emptyTranslator = new Translator(emptyMock);

      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      const results = await emptyTranslator.translateTexts(texts);

      expect(results[0].status).toBe('failed');
      expect(results[0].error).toContain('Empty');
    });

    it('should validate placeholder preservation', async () => {
      const placeholderMock = new class extends LLMAdapter {
        name = 'PlaceholderMock';
        models = ['mock'];
        async chat(): Promise<LLMResponse> {
          // 返回丢失占位符的翻译
          return { content: '你好', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        }
      }();

      const placeholderTranslator = new Translator(placeholderMock);

      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello {name}', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      const results = await placeholderTranslator.translateTexts(texts);

      expect(results[0].status).toBe('failed');
      expect(results[0].error).toContain('Placeholder');
    });
  });

  describe('context management', () => {
    it('should update context after successful translation', async () => {
      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      await translator.translateTexts(texts);

      const status = translator.getContextStatus();
      expect(status.translationCount).toBe(1);
    });

    it('should not update context after failed translation', async () => {
      mockLLM.setShouldFail(true);

      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      await translator.translateTexts(texts);

      const status = translator.getContextStatus();
      expect(status.translationCount).toBe(0);
    }, 30000);

    it('should allow manual term addition', () => {
      translator.addTerm('API', '应用程序接口');

      const status = translator.getContextStatus();
      expect(status.terminologyCount).toBeGreaterThan(0);
    });
  });

  describe('non-retriable errors', () => {
    it('should not retry on auth errors', async () => {
      const authErrorMock = new class extends LLMAdapter {
        name = 'AuthErrorMock';
        models = ['mock'];
        async chat(): Promise<LLMResponse> {
          throw new Error('Invalid API key');
        }
      }();

      const authTranslator = new Translator(authErrorMock);

      const texts: ExtractedText[] = [
        { id: '1', text: 'Hello', context: '', location: { file: 'test.ts', line: 1 }, type: 'string' }
      ];

      const results = await authTranslator.translateTexts(texts);

      expect(results[0].status).toBe('failed');
    });
  });
});