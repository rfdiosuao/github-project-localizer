import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TextExtractor } from '../src/core/extractor.js';

describe('TextExtractor', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'extractor-test');
  const extractor = new TextExtractor();

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('extractStringsFromCode', () => {
    it('should extract single-quoted strings', () => {
      const filePath = 'test.js';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `const greeting = 'Hello World';
const name = 'John';`
      );

      const result = extractor.extract(filePath, testDir);
      const texts = result.texts.filter(t => t.type === 'string');

      expect(texts.some(t => t.text === 'Hello World')).toBe(true);
      expect(texts.some(t => t.text === 'John')).toBe(true);
    });

    it('should extract double-quoted strings', () => {
      const filePath = 'test.js';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `const message = "Hello World";`
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text === 'Hello World')).toBe(true);
    });

    it('should extract template literals', () => {
      const filePath = 'test.js';
      fs.writeFileSync(
        path.join(testDir, filePath),
        'const greeting = `Hello World`;'
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text === 'Hello World')).toBe(true);
    });

    it('should skip URLs', () => {
      const filePath = 'test.js';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `const url = 'https://example.com';`
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text.includes('https://'))).toBe(false);
    });

    it('should skip pure numbers', () => {
      const filePath = 'test.js';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `const version = '123';`
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text === '123')).toBe(false);
    });

    it('should skip already Chinese text', () => {
      const filePath = 'test.js';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `const message = '这是中文';`
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text === '这是中文')).toBe(false);
    });
  });

  describe('extractCommentsFromCode', () => {
    it('should extract single-line comments', () => {
      const filePath = 'test.ts';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `// This is a comment
const x = 1;`
      );

      const result = extractor.extract(filePath, testDir);
      const comments = result.texts.filter(t => t.type === 'comment');

      expect(comments.some(t => t.text.includes('This is a comment'))).toBe(true);
    });

    it('should extract multi-line comments', () => {
      const filePath = 'test.ts';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `/* This is a
   multi-line comment */
const x = 1;`
      );

      const result = extractor.extract(filePath, testDir);
      const comments = result.texts.filter(t => t.type === 'comment');

      expect(comments.some(t => t.text.includes('multi-line'))).toBe(true);
    });

    it('should skip eslint comments', () => {
      const filePath = 'test.ts';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `// eslint-disable-next-line
const x = 1;`
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text.includes('eslint'))).toBe(false);
    });
  });

  describe('extractFromMarkdown', () => {
    it('should extract markdown content', () => {
      const filePath = 'README.md';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `# Title

This is a paragraph.

## Section

Another paragraph.`
      );

      const result = extractor.extract(filePath, testDir);
      const mdTexts = result.texts.filter(t => t.type === 'markdown');

      expect(mdTexts.some(t => t.text.includes('Title'))).toBe(true);
      expect(mdTexts.some(t => t.text.includes('paragraph'))).toBe(true);
    });

    it('should preserve link text', () => {
      const filePath = 'README.md';
      fs.writeFileSync(
        path.join(testDir, filePath),
        `[Click here](https://example.com)`
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text === 'Click here')).toBe(true);
    });
  });

  describe('extractFromJSON', () => {
    it('should extract string values from JSON', () => {
      const filePath = 'config.json';
      fs.writeFileSync(
        path.join(testDir, filePath),
        JSON.stringify({
          title: 'My App',
          description: 'A sample application'
        })
      );

      const result = extractor.extract(filePath, testDir);
      const jsonTexts = result.texts.filter(t => t.type === 'json-value');

      expect(jsonTexts.some(t => t.text === 'My App')).toBe(true);
      expect(jsonTexts.some(t => t.text === 'A sample application')).toBe(true);
    });

    it('should not extract keys', () => {
      const filePath = 'config.json';
      fs.writeFileSync(
        path.join(testDir, filePath),
        JSON.stringify({ myKey: 'myValue' })
      );

      const result = extractor.extract(filePath, testDir);
      expect(result.texts.some(t => t.text === 'myKey')).toBe(false);
      expect(result.texts.some(t => t.text === 'myValue')).toBe(true);
    });
  });
});