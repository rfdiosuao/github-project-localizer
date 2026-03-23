/**
 * 项目控制器 - 处理项目相关的 HTTP 请求
 */

import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service.js';
import { TranslationService } from '../services/translation.service.js';
import { CreateProjectRequest, StartTranslationRequest } from '../types/index.js';

export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private translationService: TranslationService
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    const projects = await this.projectService.list();
    res.json(projects);
  }

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const project = await this.projectService.get(id);
    res.json(project);
  }

  async create(req: Request, res: Response): Promise<void> {
    const { url, localPath, name } = req.body as CreateProjectRequest;
    const project = await this.projectService.create(url, localPath, name);
    res.json(project);
  }

  async scan(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await this.projectService.scan(id);
    res.json(result);
  }

  async translate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { outputMode, llmConfig } = req.body as StartTranslationRequest;
    const job = await this.translationService.start(id, { outputMode, llmConfig });
    res.json(job);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await this.projectService.delete(id);
    res.json({ success: true });
  }
}