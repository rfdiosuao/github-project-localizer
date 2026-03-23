import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Mapper } from '../src/core/mapper.js';
import { ExtractionResult } from '../src/core/extractor.js';
import { TranslationResult } from '../src/core/translator.js';

describe('Mapper', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'mapper-test');
  let mapper: Mapper;

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });

    fs.writeFileSync(
      path.join(testDir, 'src', 'app.ts'),
      `const greeting = 'Hello World';
const name = 'User';`
    );

    mapper = new Mapper(testDir, 'locale');
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('generate', () => {
    it('should generate locale files', () => {
      const extractions: ExtractionResult[] = [
        {
          file: 'src/app.ts',
          texts: [
            {
              id: 'src/app.ts:1:0',
              text: 'Hello World',
              context: 'const greeting = ',
              location: { file: 'src/app.ts', line: 1 },
              type: 'string'
            },
            {
              id: 'src/app.ts:2:0',
              text: 'User',
              context: 'const name = ',
              location: { file: 'src/app.ts', line: 2 },
              type: 'string'
            }
          ]
        }
      ];

      const translations: TranslationResult[] = [
        { original: 'Hello World', translated: '你好世界', status: 'success' },
        { original: 'User', translated: '用户', status: 'success' }
      ];

      const result = mapper.generate(extractions, translations);

      expect(result.localeFiles.length).toBe(1);
      expect(result.localeFiles[0].path).toContain('zh-CN.json');
    });

    it('should create mapping with correct keys', () => {
      const extractions: ExtractionResult[] = [
        {
          file: 'src/app.ts',
          texts: [
            {
              id: 'src/app.ts:1:0',
              text: 'Welcome Message',
              context: '',
              location: { file: 'src/app.ts', line: 1 },
              type: 'string'
            }
          ]
        }
      ];

      const translations: TranslationResult[] = [
        { original: 'Welcome Message', translated: '欢迎信息', status: 'success' }
      ];

      const result = mapper.generate(extractions, translations);
      const content = result.localeFiles[0].content;

      // 键应该包含文件前缀
      const keys = Object.keys(content);
      expect(keys.some(k => k.includes('app'))).toBe(true);
    });

    it('should skip failed translations', () => {
      const extractions: ExtractionResult[] = [
        {
          file: 'src/app.ts',
          texts: [
            {
              id: 'src/app.ts:1:0',
              text: 'Success',
              context: '',
              location: { file: 'src/app.ts', line: 1 },
              type: 'string'
            },
            {
              id: 'src/app.ts:2:0',
              text: 'Failed',
              context: '',
              location: { file: 'src/app.ts', line: 2 },
              type: 'string'
            }
          ]
        }
      ];

      const translations: TranslationResult[] = [
        { original: 'Success', translated: '成功', status: 'success' },
        { original: 'Failed', translated: '', status: 'failed', error: 'API error' }
      ];

      const result = mapper.generate(extractions, translations);
      const content = result.localeFiles[0].content;

      const values = Object.values(content);
      expect(values.includes('成功')).toBe(true);
      expect(values.includes('')).toBe(false);
    });
  });

  describe('writeFiles', () => {
    it('should create locale directory if not exists', () => {
      const extractions: ExtractionResult[] = [
        {
          file: 'src/app.ts',
          texts: [
            {
              id: 'test',
              text: 'Test',
              context: '',
              location: { file: 'src/app.ts', line: 1 },
              type: 'string'
            }
          ]
        }
      ];

      const translations: TranslationResult[] = [
        { original: 'Test', translated: '测试', status: 'success' }
      ];

      const result = mapper.generate(extractions, translations);
      mapper.writeFiles(result);

      const localePath = path.join(testDir, 'locales', 'zh-CN.json');
      expect(fs.existsSync(localePath)).toBe(true);

      // 清理
      fs.rmSync(path.join(testDir, 'locales'), { recursive: true });
    });

    it('should write valid JSON', () => {
      const extractions: ExtractionResult[] = [
        {
          file: 'src/app.ts',
          texts: [
            {
              id: 'test',
              text: 'Hello',
              context: '',
              location: { file: 'src/app.ts', line: 1 },
              type: 'string'
            }
          ]
        }
      ];

      const translations: TranslationResult[] = [
        { original: 'Hello', translated: '你好', status: 'success' }
      ];

      const result = mapper.generate(extractions, translations);
      mapper.writeFiles(result);

      const localePath = path.join(testDir, 'locales', 'zh-CN.json');
      const content = fs.readFileSync(localePath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();

      // 清理
      fs.rmSync(path.join(testDir, 'locales'), { recursive: true });
    });
  });

  describe('inline mode', () => {
    it('should generate patched files in inline mode', () => {
      const inlineMapper = new Mapper(testDir, 'inline');

      const extractions: ExtractionResult[] = [
        {
          file: 'src/app.ts',
          texts: [
            {
              id: 'test',
              text: 'Hello World',
              context: '',
              location: { file: 'src/app.ts', line: 1 },
              type: 'string'
            }
          ]
        }
      ];

      const translations: TranslationResult[] = [
        { original: 'Hello World', translated: '你好世界', status: 'success' }
      ];

      const result = inlineMapper.generate(extractions, translations);

      expect(result.patchedFiles.size).toBeGreaterThan(0);
    });
  });
});