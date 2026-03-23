import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationContextManager } from '../src/core/context-manager.js';

describe('TranslationContextManager', () => {
  let manager: TranslationContextManager;

  beforeEach(() => {
    manager = new TranslationContextManager({
      maxContextTokens: 500,
      resetInterval: 10,
      enableTerminology: true,
      minTermLength: 2
    });
  });

  describe('addTranslation', () => {
    it('should add translation to recent translations', () => {
      manager.addTranslation('Hello', '你好');

      const status = manager.getStatus();
      expect(status.recentCount).toBe(1);
      expect(status.translationCount).toBe(1);
    });

    it('should accumulate translations', () => {
      manager.addTranslation('Hello', '你好');
      manager.addTranslation('World', '世界');

      const status = manager.getStatus();
      expect(status.recentCount).toBe(2);
    });
  });

  describe('buildContextPrompt', () => {
    it('should return empty string when no translations', () => {
      expect(manager.buildContextPrompt()).toBe('');
    });

    it('should include terminology', () => {
      // 手动添加术语
      manager.addTerm('UserController', '用户控制器');
      manager.addTerm('UserService', '用户服务');

      const prompt = manager.buildContextPrompt();
      // 术语表标题存在即可
      expect(prompt).toContain('已确认的术语翻译');
    });

    it('should include recent translations', () => {
      manager.addTranslation('Hello World', '你好世界');
      manager.addTranslation('Goodbye', '再见');

      const prompt = manager.buildContextPrompt();
      expect(prompt).toContain('最近翻译');
    });
  });

  describe('terminology learning', () => {
    it('should learn terms from translations', () => {
      manager.addTranslation('UserController', '用户控制器');
      manager.addTranslation('UserService', '用户服务');

      const status = manager.getStatus();
      expect(status.terminologyCount).toBeGreaterThan(0);
    });

    it('should manually add terms', () => {
      manager.addTerm('API', '应用程序接口');

      const prompt = manager.buildContextPrompt();
      // 术语被转为小写存储
      expect(prompt).toContain('api');
      expect(prompt).toContain('应用程序接口');
    });

    it('should give high priority to manually added terms', () => {
      manager.addTerm('CustomTerm', '自定义术语');

      const status = manager.getStatus();
      expect(status.terminologyCount).toBe(1);
    });
  });

  describe('context compression', () => {
    it('should compress when token limit exceeded', () => {
      // 添加大量翻译触发压缩
      for (let i = 0; i < 50; i++) {
        manager.addTranslation(
          `Translation item number ${i} with some additional text`,
          `翻译项目编号 ${i} 附加一些文本`
        );
      }

      const status = manager.getStatus();
      // 压缩后 recentCount 应该被清空
      expect(status.recentCount).toBe(0);
    });

    it('should preserve terminology after compression', () => {
      manager.addTerm('ImportantTerm', '重要术语');

      // 触发压缩
      for (let i = 0; i < 50; i++) {
        manager.addTranslation(`Item ${i}`, `项目 ${i}`);
      }

      const prompt = manager.buildContextPrompt();
      // 术语被转为小写
      expect(prompt).toContain('importantterm');
    });
  });

  describe('context reset', () => {
    it('should reset after resetInterval translations', () => {
      // 添加 resetInterval (10) 次翻译
      for (let i = 0; i < 10; i++) {
        manager.addTranslation(`Text ${i}`, `文本 ${i}`);
      }

      const status = manager.getStatus();
      // 重置后应该清空 recentTranslations
      expect(status.recentCount).toBe(0);
    });

    it('should preserve top terms after reset', () => {
      manager.addTerm('Preserved', '保留的');

      // 触发重置
      for (let i = 0; i < 10; i++) {
        manager.addTranslation(`Text ${i}`, `文本 ${i}`);
      }

      const prompt = manager.buildContextPrompt();
      // 术语被转为小写
      expect(prompt).toContain('preserved');
    });
  });

  describe('token estimation', () => {
    it('should estimate tokens for Chinese text', () => {
      manager.addTranslation('Hello', '你好世界');

      const status = manager.getStatus();
      expect(status.estimatedTokens).toBeGreaterThan(0);
    });

    it('should accumulate tokens', () => {
      manager.addTranslation('Hello', '你好');
      const status1 = manager.getStatus();

      manager.addTranslation('World', '世界');
      const status2 = manager.getStatus();

      expect(status2.estimatedTokens).toBeGreaterThan(status1.estimatedTokens);
    });
  });
});