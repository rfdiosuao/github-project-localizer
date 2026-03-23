import * as fs from 'fs';
import * as path from 'path';
import { ExtractionResult } from './extractor.js';
import { TranslationResult } from './translator.js';

export interface LocaleFile {
  path: string;
  content: Record<string, string>;
}

export interface MappingResult {
  localeFiles: LocaleFile[];
  patchedFiles: Map<string, string>; // 原文件路径 -> 修改后的内容
}

export type OutputMode = 'locale' | 'inline' | 'both';

/**
 * 映射生成器 - 生成本地化文件或内联修改
 */
export class Mapper {
  private projectPath: string;
  private outputMode: OutputMode;
  private localeDir: string;

  constructor(
    projectPath: string,
    outputMode: OutputMode = 'locale',
    localeDir: string = 'locales'
  ) {
    this.projectPath = projectPath;
    this.outputMode = outputMode;
    this.localeDir = localeDir;
  }

  /**
   * 生成映射文件
   */
  generate(
    extractions: ExtractionResult[],
    translations: TranslationResult[]
  ): MappingResult {
    const localeFiles: LocaleFile[] = [];
    const patchedFiles = new Map<string, string>();

    // 合并提取结果和翻译结果
    const mapping = this.createMapping(extractions, translations);

    if (this.outputMode === 'locale' || this.outputMode === 'both') {
      localeFiles.push(...this.generateLocaleFiles(mapping));
    }

    if (this.outputMode === 'inline' || this.outputMode === 'both') {
      // 内联修改（谨慎使用）
      for (const [filePath, items] of mapping.entries()) {
        const patched = this.patchFile(filePath, items);
        if (patched) {
          patchedFiles.set(filePath, patched);
        }
      }
    }

    return { localeFiles, patchedFiles };
  }

  /**
   * 创建映射关系
   */
  private createMapping(
    extractions: ExtractionResult[],
    translations: TranslationResult[]
  ): Map<string, Array<{ original: string; translated: string; location: any }>> {
    const mapping = new Map<string, Array<{ original: string; translated: string; location: any }>>();

    let translationIndex = 0;

    for (const extraction of extractions) {
      const fileItems: Array<{ original: string; translated: string; location: any }> = [];

      for (const text of extraction.texts) {
        const translation = translations[translationIndex++];

        if (translation && translation.status === 'success') {
          fileItems.push({
            original: text.text,
            translated: translation.translated,
            location: text.location
          });
        }
      }

      if (fileItems.length > 0) {
        mapping.set(extraction.file, fileItems);
      }
    }

    return mapping;
  }

  /**
   * 生成语言文件
   */
  private generateLocaleFiles(
    mapping: Map<string, Array<{ original: string; translated: string; location: any }>>
  ): LocaleFile[] {
    const localeContent: Record<string, string> = {};

    // 为每个字符串生成唯一键
    for (const [file, items] of mapping.entries()) {
      const prefix = this.generateKeyPrefix(file);

      items.forEach((item, index) => {
        const key = `${prefix}.${this.generateKey(item.original, index)}`;
        localeContent[key] = item.translated;
      });
    }

    return [{
      path: path.join(this.localeDir, 'zh-CN.json'),
      content: localeContent
    }];
  }

  /**
   * 生成键前缀
   */
  private generateKeyPrefix(filePath: string): string {
    return filePath
      .replace(/\//g, '.')
      .replace(/\\/g, '.')
      .replace(/\.[^/.]+$/, '') // 移除扩展名
      .replace(/^src\./, ''); // 移除src前缀
  }

  /**
   * 生成唯一键
   */
  private generateKey(text: string, index: number): string {
    // 使用文本前几个单词作为键
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w)
      .slice(0, 4)
      .join('_');

    return words || `text_${index}`;
  }

  /**
   * 内联修改文件（高风险）
   */
  private patchFile(
    filePath: string,
    items: Array<{ original: string; translated: string; location: any }>
  ): string | null {
    try {
      const fullPath = path.join(this.projectPath, filePath);
      let content = fs.readFileSync(fullPath, 'utf-8');

      // 按位置倒序替换，避免位置偏移
      const sortedItems = [...items].sort((a, b) => {
        return (b.location.line || 0) - (a.location.line || 0);
      });

      for (const item of sortedItems) {
        // 简单替换（实际需要更精确的位置匹配）
        const escaped = this.escapeRegExp(item.original);
        const regex = new RegExp(`(['"\`])${escaped}\\1`, 'g');
        content = content.replace(regex, `$1${item.translated}$1`);
      }

      return content;
    } catch {
      return null;
    }
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 写入文件
   */
  writeFiles(result: MappingResult): void {
    // 写入语言文件
    for (const localeFile of result.localeFiles) {
      const fullPath = path.join(this.projectPath, localeFile.path);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        fullPath,
        JSON.stringify(localeFile.content, null, 2),
        'utf-8'
      );
    }

    // 写入修改后的文件（如果选择内联模式）
    for (const [filePath, content] of result.patchedFiles) {
      const fullPath = path.join(this.projectPath, filePath);
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}