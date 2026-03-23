/**
 * 服务端类型定义
 */

// 枚举类型
export type ProjectStatus = 'pending' | 'cloning' | 'scanning' | 'extracting' | 'translating' | 'complete' | 'error';
export type JobStatus = 'pending' | 'running' | 'complete' | 'error';
export type OutputMode = 'locale' | 'inline' | 'both';
export type TranslationStep = 'extracting' | 'translating' | 'generating' | 'complete';

// 核心实体
export interface Project {
  id: string;
  name: string;
  url?: string;
  localPath: string;
  status: ProjectStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationProgress {
  current: number;
  total: number;
  currentFile: string;
  status: TranslationStep;
}

export interface TranslationResults {
  extractedCount: number;
  translatedCount: number;
  failedCount: number;
}

export interface TranslationJob {
  id: string;
  projectId: string;
  status: JobStatus;
  outputMode: OutputMode;
  llmProvider: string;
  llmModel?: string;
  progress: TranslationProgress;
  results?: TranslationResults;
  error?: string;
}

// API请求/响应类型
export interface CreateProjectRequest {
  url?: string;
  localPath?: string;
  name?: string;
}

export interface StartTranslationRequest {
  outputMode: OutputMode;
  llmConfig: {
    provider: string;
    model?: string;
  };
}

export interface ScanResult {
  totalFiles: number;
  translatableFiles: number;
  files: string[];
}

// LLM工厂类型
export interface LLMConfig {
  provider: 'openai' | 'claude' | 'deepseek';
  model?: string;
}

// 自定义错误类
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}