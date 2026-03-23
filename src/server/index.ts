/**
 * 服务器入口
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, Config } from '../config/index.js';
import { SQLiteRepository } from './repositories/sqlite.repository.js';
import { ProjectService } from './services/project.service.js';
import { TranslationService } from './services/translation.service.js';
import { createApp } from './app.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const config = loadConfig();

  // 初始化数据库
  const repo = new SQLiteRepository(config);
  await repo.init();

  // 恢复中断的任务
  await recoverInterruptedJobs(repo);

  // 创建服务
  const projectService = new ProjectService(repo, config);
  const translationService = new TranslationService(repo, config);

  // 创建应用
  const app = createApp({ projectService, translationService }, config);

  // 启动服务器
  app.listen(config.port, () => {
    logger.info(`Server running at http://localhost:${config.port}`);
  });
}

async function recoverInterruptedJobs(repo: SQLiteRepository): Promise<void> {
  const runningJobs = await repo.findJobsByStatus('running');
  for (const job of runningJobs) {
    logger.warn(`Job ${job.id} was interrupted, marking as error`);
    await repo.updateJob(job.id, {
      status: 'error',
      error: 'Service restarted during translation'
    });
  }
}

bootstrap().catch(err => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});