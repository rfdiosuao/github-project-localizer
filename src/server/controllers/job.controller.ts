/**
 * 任务控制器 - 处理翻译任务相关的 HTTP 请求
 */

import { Request, Response } from 'express';
import { TranslationService } from '../services/translation.service.js';

export class JobController {
  constructor(private translationService: TranslationService) {}

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const job = await this.translationService.getJob(id);
    res.json(job);
  }
}