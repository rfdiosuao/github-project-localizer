/**
 * 翻译上下文管理器
 *
 * 解决两个问题：
 * 1. 术语一致性 - 通过术语表保持翻译一致
 * 2. 上下文幻觉 - 通过定期压缩和重置防止幻觉
 */

export interface TranslationPair {
  original: string;
  translated: string;
}

// 上下文配置
export interface ContextConfig {
  // 最大上下文 token 数（估算）
  maxContextTokens: number;
  // 每批次重置阈值
  resetInterval: number;
  // 是否启用术语学习
  enableTerminology: boolean;
  // 术语最小长度（过滤太短的词）
  minTermLength: number;
}

const DEFAULT_CONFIG: ContextConfig = {
  maxContextTokens: 2000,
  resetInterval: 50,  // 每50个翻译重置上下文
  enableTerminology: true,
  minTermLength: 3
};

/**
 * 估算文本的 token 数
 * 中文约 1.5 字符/token，英文约 4 字符/token
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 提取关键术语（名词、专业词汇等）
 */
function extractTerms(text: string): string[] {
  // 英文单词（排除常见词）
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just'
  ]);

  const words = text.match(/[a-zA-Z][a-zA-Z0-9_-]*/g) || [];
  return words
    .filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()))
    .filter(w => /^[A-Z]/.test(w) || w.includes('_') || w.includes('-')) // 大写开头或包含下划线/连字符
    .map(w => w.toLowerCase());
}

export class TranslationContextManager {
  private config: ContextConfig;

  // 术语表：英文 -> 中文
  private terminology: Map<string, string> = new Map();

  // 术语使用频率
  private termFrequency: Map<string, number> = new Map();

  // 最近翻译结果（滑动窗口）
  private recentTranslations: TranslationPair[] = [];

  // 当前 token 估算
  private currentTokens: number = 0;

  // 翻译计数（用于重置）
  private translationCount: number = 0;

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加翻译结果到上下文
   */
  addTranslation(original: string, translated: string): void {
    const pair: TranslationPair = { original, translated };

    // 添加到最近翻译
    this.recentTranslations.push(pair);
    this.currentTokens += estimateTokens(original) + estimateTokens(translated);

    // 学习术语
    if (this.config.enableTerminology) {
      this.learnTerminology(original, translated);
    }

    this.translationCount++;

    // 检查是否需要压缩或重置
    if (this.translationCount % this.config.resetInterval === 0) {
      this.reset();
    } else if (this.currentTokens > this.config.maxContextTokens) {
      this.compress();
    }
  }

  /**
   * 学习术语映射
   */
  private learnTerminology(original: string, translated: string): void {
    const terms = extractTerms(original);

    for (const term of terms) {
      // 尝试在翻译中找到对应词
      const translatedTerm = this.findTranslatedTerm(term, translated);
      if (translatedTerm) {
        const existing = this.terminology.get(term);
        if (existing) {
          // 更新频率
          this.termFrequency.set(term, (this.termFrequency.get(term) || 0) + 1);
        } else {
          this.terminology.set(term, translatedTerm);
          this.termFrequency.set(term, 1);
        }
      }
    }
  }

  /**
   * 在翻译中找到术语的对应词
   */
  private findTranslatedTerm(term: string, translated: string): string | null {
    // 简单实现：查找包含中文字符的词
    const chineseWords = translated.match(/[\u4e00-\u9fa5]+/g) || [];

    // 术语对应的中文（简化处理）
    // 实际可以用更复杂的算法
    for (const word of chineseWords) {
      if (word.length >= 2 && word.length <= 6) {
        return word;
      }
    }

    return null;
  }

  /**
   * 构建上下文提示词
   */
  buildContextPrompt(): string {
    if (this.terminology.size === 0 && this.recentTranslations.length === 0) {
      return '';
    }

    const parts: string[] = [];

    // 添加术语表
    if (this.terminology.size > 0) {
      const topTerms = this.getTopTerms(20);
      if (topTerms.length > 0) {
        parts.push('## 已确认的术语翻译（请保持一致）');
        parts.push(topTerms.map(([en, zh]) => `- ${en} → ${zh}`).join('\n'));
      }
    }

    // 添加最近的翻译示例
    if (this.recentTranslations.length > 0) {
      const recent = this.recentTranslations.slice(-5);
      parts.push('\n## 最近翻译示例');
      parts.push(recent.map(p => `- "${p.original}" → "${p.translated}"`).join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * 获取高频术语
   */
  private getTopTerms(limit: number): Array<[string, string]> {
    return Array.from(this.terminology.entries())
      .sort((a, b) => (this.termFrequency.get(b[0]) || 0) - (this.termFrequency.get(a[0]) || 0))
      .slice(0, limit);
  }

  /**
   * 压缩上下文（保留高频术语）
   */
  compress(): void {
    // 只保留高频术语
    const topTerms = this.getTopTerms(15);
    this.terminology = new Map(topTerms);

    // 清空最近翻译（术语已保留）
    this.recentTranslations = [];

    // 重新计算 token
    this.currentTokens = Array.from(this.terminology.keys())
      .reduce((sum, k) => sum + estimateTokens(k), 0);
  }

  /**
   * 重置上下文（防止幻觉累积）
   */
  reset(): void {
    // 保留最高频的几个术语
    const topTerms = this.getTopTerms(5);

    this.terminology = new Map(topTerms);
    this.recentTranslations = [];
    this.currentTokens = topTerms.reduce((sum, [k]) => sum + estimateTokens(k), 0);
    this.termFrequency = new Map(topTerms.map(([k]) => [k, this.termFrequency.get(k) || 1]));
  }

  /**
   * 手动添加术语
   */
  addTerm(original: string, translated: string): void {
    this.terminology.set(original.toLowerCase(), translated);
    this.termFrequency.set(original.toLowerCase(), 100); // 高优先级
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    terminologyCount: number;
    recentCount: number;
    estimatedTokens: number;
    translationCount: number;
  } {
    return {
      terminologyCount: this.terminology.size,
      recentCount: this.recentTranslations.length,
      estimatedTokens: this.currentTokens,
      translationCount: this.translationCount
    };
  }
}