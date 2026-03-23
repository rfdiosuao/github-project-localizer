import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedText {
  id: string;
  text: string;
  context: string;
  location: {
    file: string;
    line: number;
    column?: number;
  };
  type: 'string' | 'comment' | 'markdown' | 'json-value';
}

export interface ExtractionResult {
  file: string;
  texts: ExtractedText[];
}

/**
 * 从代码中提取字符串字面量
 */
function extractStringsFromCode(content: string, file: string): ExtractedText[] {
  const results: ExtractedText[] = [];

  // 匹配单引号字符串
  const singleQuoteRegex = /'([^'\\]*(\\.[^'\\]*)*)'/g;
  // 匹配双引号字符串
  const doubleQuoteRegex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
  // 匹配模板字符串（简化版）
  const templateRegex = /`([^`\\]*(\\.[^`\\]*)*)`/g;

  const processMatch = (regex: RegExp, quoteChar: string) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1];

      // 过滤掉不需要翻译的内容
      if (shouldSkip(text)) continue;

      // 计算行号
      const beforeMatch = content.substring(0, match.index);
      const line = beforeMatch.split('\n').length;

      // 获取上下文（前后各50字符）
      const start = Math.max(0, match.index - 50);
      const end = Math.min(content.length, match.index + match[0].length + 50);
      const context = content.substring(start, end).replace(/\n/g, ' ');

      results.push({
        id: `${file}:${line}:${match.index}`,
        text,
        context,
        location: { file, line },
        type: 'string'
      });
    }
  };

  processMatch(singleQuoteRegex, "'");
  processMatch(doubleQuoteRegex, '"');
  processMatch(templateRegex, '`');

  return results;
}

/**
 * 从代码中提取注释
 */
function extractCommentsFromCode(content: string, file: string): ExtractedText[] {
  const results: ExtractedText[] = [];

  // 单行注释
  const singleLineRegex = /\/\/\s*(.+)$/gm;
  // 多行注释
  const multiLineRegex = /\/\*[\s\S]*?\*\//g;

  let match;
  while ((match = singleLineRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length < 2 || text.startsWith('eslint') || text.startsWith('tslint')) continue;

    const beforeMatch = content.substring(0, match.index);
    const line = beforeMatch.split('\n').length;

    results.push({
      id: `${file}:${line}:comment`,
      text,
      context: `// ${text}`,
      location: { file, line },
      type: 'comment'
    });
  }

  while ((match = multiLineRegex.exec(content)) !== null) {
    const text = match[0]
      .replace(/\/\*|\*\//g, '')
      .split('\n')
      .map(l => l.trim().replace(/^\*/, '').trim())
      .filter(l => l)
      .join('\n');

    if (text.length < 2) continue;

    const beforeMatch = content.substring(0, match.index);
    const line = beforeMatch.split('\n').length;

    results.push({
      id: `${file}:${line}:block-comment`,
      text,
      context: text.substring(0, 100),
      location: { file, line },
      type: 'comment'
    });
  }

  return results;
}

/**
 * 从Markdown提取文本
 */
function extractFromMarkdown(content: string, file: string): ExtractedText[] {
  const results: ExtractedText[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // 跳过代码块
    if (line.startsWith('```')) return;
    // 跳过空行
    if (!line.trim()) return;

    // 提取标题、段落等
    const cleanLine = line
      .replace(/^#+\s*/, '')  // 移除标题标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 保留链接文本
      .replace(/[*_`~]/g, '');  // 移除格式标记

    if (cleanLine.trim().length > 1) {
      results.push({
        id: `${file}:${index + 1}:md`,
        text: cleanLine.trim(),
        context: line.trim(),
        location: { file, line: index + 1 },
        type: 'markdown'
      });
    }
  });

  return results;
}

/**
 * 从JSON提取值
 */
function extractFromJSON(content: string, file: string): ExtractedText[] {
  const results: ExtractedText[] = [];

  try {
    const json = JSON.parse(content);
    const traverse = (obj: unknown, path: string[] = []) => {
      if (typeof obj === 'string' && obj.trim()) {
        results.push({
          id: `${file}:${path.join('.')}`,
          text: obj,
          context: path.join('.'),
          location: { file, line: 0 },
          type: 'json-value'
        });
      } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => traverse(item, [...path, String(i)]));
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          traverse(value, [...path, key]);
        });
      }
    };
    traverse(json);
  } catch (e) {
    // JSON解析失败，忽略
  }

  return results;
}

/**
 * 判断是否应该跳过该字符串
 */
function shouldSkip(text: string): boolean {
  // 空字符串
  if (!text.trim()) return true;

  // 纯数字
  if (/^\d+$/.test(text)) return true;

  // URL
  if (/^https?:\/\//.test(text)) return true;

  // 文件路径
  if (/^[\/\\]/.test(text) || /^\.\.?[\/\\]/.test(text)) return true;

  // 纯英文变量名风格
  if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(text)) return true;

  // 已经是中文
  if (/[\u4e00-\u9fa5]/.test(text)) return true;

  // 太短
  if (text.length < 2) return true;

  // 特殊格式
  if (text.startsWith('<') || text.startsWith('{') || text.startsWith('[')) {
    // 可能是代码片段
    if (text.includes('=>') || text.includes('function')) return true;
  }

  return false;
}

/**
 * 文本提取器
 */
export class TextExtractor {
  extract(filePath: string, projectPath: string): ExtractionResult {
    const content = fs.readFileSync(path.join(projectPath, filePath), 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    const texts: ExtractedText[] = [];

    switch (ext) {
      case '.md':
      case '.mdx':
        texts.push(...extractFromMarkdown(content, filePath));
        break;

      case '.json':
        texts.push(...extractFromJSON(content, filePath));
        break;

      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
      case '.vue':
        texts.push(...extractStringsFromCode(content, filePath));
        texts.push(...extractCommentsFromCode(content, filePath));
        break;

      default:
        // 尝试作为代码处理
        texts.push(...extractStringsFromCode(content, filePath));
    }

    return { file: filePath, texts };
  }

  extractMultiple(files: string[], projectPath: string): ExtractionResult[] {
    return files.map(file => this.extract(file, projectPath));
  }
}