/**
 * Express 应用配置
 */

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { projectRoutes } from './routes/projects.js';
import { jobRoutes } from './routes/jobs.js';
import { llmRoutes } from './routes/llm.js';
import { errorHandler } from './middleware/error.handler.js';
import { ProjectService } from './services/project.service.js';
import { TranslationService } from './services/translation.service.js';
import { Config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppServices {
  projectService: ProjectService;
  translationService: TranslationService;
}

export function createApp(services: AppServices, config: Config): express.Application {
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json());

  // API 路由
  app.use('/api/projects', projectRoutes(services.projectService, services.translationService));
  app.use('/api/jobs', jobRoutes(services.translationService));
  app.use('/api/llm', llmRoutes());

  // 静态文件
  app.use(express.static(path.join(__dirname, '../../ui/dist')));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../ui/dist/index.html'));
  });

  // 错误处理（必须在最后）
  app.use(errorHandler);

  return app;
}