/**
 * 项目路由
 */

import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { ProjectService } from '../services/project.service.js';
import { TranslationService } from '../services/translation.service.js';

export function projectRoutes(
  projectService: ProjectService,
  translationService: TranslationService
): Router {
  const router = Router();
  const controller = new ProjectController(projectService, translationService);

  router.get('/', (req, res, next) => controller.list(req, res).catch(next));
  router.post('/', (req, res, next) => controller.create(req, res).catch(next));
  router.get('/:id', (req, res, next) => controller.get(req, res).catch(next));
  router.delete('/:id', (req, res, next) => controller.delete(req, res).catch(next));
  router.post('/:id/scan', (req, res, next) => controller.scan(req, res).catch(next));
  router.post('/:id/translate', (req, res, next) => controller.translate(req, res).catch(next));

  return router;
}