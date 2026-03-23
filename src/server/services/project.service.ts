/**
 * 项目服务 - 管理项目的业务逻辑
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project, ProjectStatus, ScanResult, NotFoundError } from '../types/index.js';
import { SQLiteRepository } from '../repositories/sqlite.repository.js';
import { Config } from '../../config/index.js';
import { ProjectScanner } from '../../core/scanner.js';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

export class ProjectService {
  constructor(
    private repo: SQLiteRepository,
    private config: Config
  ) {}

  async list(): Promise<Project[]> {
    return this.repo.findAllProjects();
  }

  async get(id: string): Promise<Project> {
    const project = await this.repo.findProjectById(id);
    if (!project) {
      throw new NotFoundError(`Project ${id} not found`);
    }
    return project;
  }

  async create(url?: string, localPath?: string, name?: string): Promise<Project> {
    // 确保项目目录存在
    const projectsDir = this.config.projectsDir;
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    let finalLocalPath = localPath || '';
    let finalName = name;

    if (url) {
      // 从 GitHub URL 克隆
      finalName = name || path.basename(url, '.git');
      finalLocalPath = path.join(projectsDir, finalName);

      try {
        await execAsync(`git clone "${url}" "${finalLocalPath}"`);
        logger.info('Project cloned', { url, path: finalLocalPath });
      } catch (error) {
        logger.error('Failed to clone repository', error as Error, { url });
        throw new Error(`Failed to clone repository: ${(error as Error).message}`);
      }
    } else if (localPath) {
      finalName = name || path.basename(localPath);
    } else {
      throw new Error('Either url or localPath must be provided');
    }

    const project = await this.repo.createProject({
      id: '',
      name: finalName,
      url,
      localPath: finalLocalPath,
      status: 'pending'
    });

    return project;
  }

  async scan(id: string): Promise<ScanResult> {
    const project = await this.get(id);

    await this.repo.updateProject(id, { status: 'scanning' });

    try {
      const scanner = new ProjectScanner(project.localPath);
      const files = await scanner.scan();
      const translatable = scanner.getTranslatableFiles(files);

      await this.repo.updateProject(id, { status: 'pending' });

      logger.info('Project scanned', {
        projectId: id,
        totalFiles: files.length,
        translatableFiles: translatable.length
      });

      return {
        totalFiles: files.length,
        translatableFiles: translatable.length,
        files: translatable.slice(0, 100).map(f => f.path)
      };
    } catch (error) {
      await this.repo.updateProject(id, {
        status: 'error',
        error: (error as Error).message
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const project = await this.get(id);

    // 删除项目目录（如果是克隆的）
    if (project.url && project.localPath && fs.existsSync(project.localPath)) {
      fs.rmSync(project.localPath, { recursive: true });
      logger.info('Project directory removed', { path: project.localPath });
    }

    await this.repo.deleteProject(id);
    logger.info('Project deleted', { projectId: id });
  }
}