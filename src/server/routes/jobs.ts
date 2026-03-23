/**
 * 任务路由
 */

import { Router } from 'express';
import { JobController } from '../controllers/job.controller.js';
import { TranslationService } from '../services/translation.service.js';

export function jobRoutes(translationService: TranslationService): Router {
  const router = Router();
  const controller = new JobController(translationService);

  router.get('/:id', (req, res, next) => controller.get(req, res).catch(next));

  return router;
}