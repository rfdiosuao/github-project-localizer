/**
 * 翻译服务 - 协调翻译任务
 */

import {
  TranslationJob,
  Project,
  StartTranslationRequest,
  NotFoundError
} from '../types/index.js';
import { SQLiteRepository } from '../repositories/sqlite.repository.js';
import { LLMAdapter } from '../../llm/base.js';
import { OpenAIAdapter } from '../../llm/openai.js';
import { ClaudeAdapter } from '../../llm/claude.js';
import { DeepSeekAdapter } from '../../llm/deepseek.js';
import { Config } from '../../config/index.js';
import { ProjectScanner } from '../../core/scanner.js';
import { TextExtractor } from '../../core/extractor.js';
import { Translator } from '../../core/translator.js';
import { Mapper } from '../../core/mapper.js';
import logger from '../../utils/logger.js';

type LLMFactory = (provider: string, model?: string) => LLMAdapter;

function createLLMFactory(config: Config): LLMFactory {
  return (provider: string, model?: string): LLMAdapter => {
    switch (provider) {
      case 'openai':
        return new OpenAIAdapter({
          apiKey: config.llm.openai.apiKey!,
          baseUrl: config.llm.openai.baseUrl,
          defaultModel: model
        });
      case 'claude':
        return new ClaudeAdapter({
          apiKey: config.llm.claude.apiKey!,
          defaultModel: model
        });
      case 'deepseek':
        return new DeepSeekAdapter({
          apiKey: config.llm.deepseek.apiKey!,
          baseUrl: config.llm.deepseek.baseUrl,
          defaultModel: model
        });
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  };
}

export class TranslationService {
  private llmFactory: LLMFactory;

  constructor(
    private repo: SQLiteRepository,
    private config: Config
  ) {
    this.llmFactory = createLLMFactory(config);
  }

  async start(projectId: string, options: StartTranslationRequest): Promise<TranslationJob> {
    // 验证项目存在
    const project = await this.repo.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    // 创建任务
    const job = await this.repo.createJob({
      projectId,
      status: 'pending',
      outputMode: options.outputMode,
      llmProvider: options.llmConfig.provider,
      llmModel: options.llmConfig.model,
      progress: { current: 0, total: 0, currentFile: '', status: 'extracting' }
    });

    logger.info('Translation job created', { jobId: job.id, projectId });

    // 异步执行翻译
    this.runAsync(job.id);

    return job;
  }

  async getJob(jobId: string): Promise<TranslationJob> {
    const job = await this.repo.findJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found`);
    }
    return job;
  }

  private async runAsync(jobId: string): Promise<void> {
    try {
      const job = await this.repo.findJobById(jobId);
      if (!job) return;

      const project = await this.repo.findProjectById(job.projectId);
      if (!project) {
        await this.repo.updateJob(jobId, { status: 'error', error: 'Project not found' });
        return;
      }

      await this.run(job, project);
    } catch (error) {
      logger.error('Translation job failed', error as Error, { jobId });
      await this.repo.updateJob(jobId, {
        status: 'error',
        error: (error as Error).message
      });
    }
  }

  private async updateProgress(jobId: string, progress: TranslationJob['progress']): Promise<void> {
    await this.repo.updateJob(jobId, { progress });
  }

  async run(job: TranslationJob, project: Project): Promise<void> {
    // 更新状态
    await this.repo.updateJob(job.id, { status: 'running' });
    await this.repo.updateProject(project.id, { status: 'translating' });

    try {
      // 扫描项目
      const scanner = new ProjectScanner(project.localPath);
      const files = await scanner.scan();
      const translatable = scanner.getTranslatableFiles(files);

      logger.info('Scanning complete', { jobId: job.id, files: translatable.length });

      // 提取文本
      const extractor = new TextExtractor();
      const extractions = extractor.extractMultiple(
        translatable.map(f => f.path),
        project.localPath
      );

      const allTexts = extractions.flatMap(e => e.texts);
      await this.updateProgress(job.id, {
        current: 0,
        total: allTexts.length,
        currentFile: '',
        status: 'translating'
      });

      logger.info('Extraction complete', { jobId: job.id, texts: allTexts.length });

      // 创建 LLM 实例
      const llm = this.llmFactory(job.llmProvider, job.llmModel);

      // 翻译
      const translator = new Translator(llm, progress => {
        this.updateProgress(job.id, progress).catch(err => {
          logger.error('Failed to update progress', err);
        });
      });

      const translations = await translator.translateTexts(allTexts, 5);

      logger.info('Translation complete', {
        jobId: job.id,
        success: translations.filter(t => t.status === 'success').length,
        failed: translations.filter(t => t.status === 'failed').length
      });

      // 生成映射
      await this.updateProgress(job.id, { ...job.progress, status: 'generating' });

      const mapper = new Mapper(project.localPath, job.outputMode);
      const result = mapper.generate(extractions, translations);
      mapper.writeFiles(result);

      logger.info('Mapping complete', { jobId: job.id, localeFiles: result.localeFiles.length });

      // 更新完成状态
      await this.repo.updateJob(job.id, {
        status: 'complete',
        progress: { current: allTexts.length, total: allTexts.length, currentFile: '', status: 'complete' },
        results: {
          extractedCount: allTexts.length,
          translatedCount: translations.filter(t => t.status === 'success').length,
          failedCount: translations.filter(t => t.status === 'failed').length
        }
      });

      await this.repo.updateProject(project.id, { status: 'complete' });

    } catch (error) {
      logger.error('Translation failed', error as Error, { jobId: job.id });
      await this.repo.updateJob(job.id, {
        status: 'error',
        error: (error as Error).message
      });
      await this.repo.updateProject(project.id, {
        status: 'error',
        error: (error as Error).message
      });
      throw error;
    }
  }
}