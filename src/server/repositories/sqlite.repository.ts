/**
 * SQLite 数据仓储
 * 使用 sql.js 作为 SQLite 引擎（纯JS实现，无需编译）
 */

import initSqlJs, { Database, SqlValue } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  Project,
  TranslationJob,
  ProjectStatus,
  JobStatus,
  OutputMode,
  TranslationStep
} from '../types/index.js';
import { Config } from '../../config/index.js';
import logger from '../../utils/logger.js';

// SQL Schema
const SCHEMA = `
-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  local_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 翻译任务表
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output_mode TEXT NOT NULL DEFAULT 'locale',
  llm_provider TEXT NOT NULL,
  llm_model TEXT,
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  progress_status TEXT DEFAULT 'extracting',
  progress_file TEXT,
  results_extracted INTEGER,
  results_translated INTEGER,
  results_failed INTEGER,
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
`;

// 字段映射函数
function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string | undefined,
    localPath: row.local_path as string,
    status: row.status as ProjectStatus,
    error: row.error as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string)
  };
}

function rowToJob(row: Record<string, unknown>): TranslationJob {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    status: row.status as JobStatus,
    outputMode: row.output_mode as OutputMode,
    llmProvider: row.llm_provider as string,
    llmModel: row.llm_model as string | undefined,
    progress: {
      current: row.progress_current as number,
      total: row.progress_total as number,
      currentFile: (row.progress_file as string) || '',
      status: row.progress_status as TranslationStep
    },
    results: row.results_extracted != null ? {
      extractedCount: row.results_extracted as number,
      translatedCount: row.results_translated as number,
      failedCount: row.results_failed as number
    } : undefined,
    error: row.error as string | undefined
  };
}

export class SQLiteRepository {
  private db: Database | null = null;
  private dbPath: string;

  constructor(config: Config) {
    this.dbPath = config.database.path;
  }

  async init(): Promise<void> {
    // 确保 data 目录存在
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 初始化 sql.js
    const SQL = await initSqlJs();

    // 尝试加载现有数据库
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
      logger.info('Database loaded', { path: this.dbPath });
    } else {
      this.db = new SQL.Database();
      logger.info('Database created', { path: this.dbPath });
    }

    // 执行 schema
    this.db.run(SCHEMA);
    this.save();
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== Project Methods ====================

  async findAllProjects(): Promise<Project[]> {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM projects ORDER BY created_at DESC');
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return rowToProject(obj);
    });
  }

  async findProjectById(id: string): Promise<Project | null> {
    if (!this.db) return null;
    const result = this.db.exec('SELECT * FROM projects WHERE id = ?', [id] as SqlValue[]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return rowToProject(obj);
  }

  async createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    const id = project.id || this.generateId();

    this.db.run(
      `INSERT INTO projects (id, name, url, local_path, status, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project.name, project.url || null, project.localPath, project.status, project.error || null, now, now] as SqlValue[]
    );
    this.save();

    const created = await this.findProjectById(id);
    if (!created) throw new Error('Failed to create project');
    return created;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (!this.db) return null;
    const now = new Date().toISOString();

    const setClauses: string[] = ['updated_at = ?'];
    const values: SqlValue[] = [now];

    if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
    if (updates.url !== undefined) { setClauses.push('url = ?'); values.push(updates.url); }
    if (updates.localPath !== undefined) { setClauses.push('local_path = ?'); values.push(updates.localPath); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }
    if (updates.error !== undefined) { setClauses.push('error = ?'); values.push(updates.error); }

    values.push(id);
    this.db.run(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values);
    this.save();

    return this.findProjectById(id);
  }

  async deleteProject(id: string): Promise<boolean> {
    if (!this.db) return false;
    // 先删除关联的 jobs
    this.db.run('DELETE FROM jobs WHERE project_id = ?', [id] as SqlValue[]);
    this.db.run('DELETE FROM projects WHERE id = ?', [id] as SqlValue[]);
    this.save();
    return true;
  }

  // ==================== Job Methods ====================

  async findAllJobs(): Promise<TranslationJob[]> {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM jobs ORDER BY created_at DESC');
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return rowToJob(obj);
    });
  }

  async findJobById(id: string): Promise<TranslationJob | null> {
    if (!this.db) return null;
    const result = this.db.exec('SELECT * FROM jobs WHERE id = ?', [id] as SqlValue[]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return rowToJob(obj);
  }

  findJobsByProjectId(projectId: string): TranslationJob[] {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at DESC', [projectId] as SqlValue[]);
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return rowToJob(obj);
    });
  }

  async findJobsByStatus(status: JobStatus): Promise<TranslationJob[]> {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC', [status] as SqlValue[]);
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return rowToJob(obj);
    });
  }

  async createJob(job: Omit<TranslationJob, 'id'>): Promise<TranslationJob> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    const id = this.generateId();

    this.db.run(
      `INSERT INTO jobs (
        id, project_id, status, output_mode, llm_provider, llm_model,
        progress_current, progress_total, progress_status, progress_file,
        results_extracted, results_translated, results_failed, error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, job.projectId, job.status, job.outputMode, job.llmProvider, job.llmModel || null,
        job.progress.current, job.progress.total, job.progress.status, job.progress.currentFile || null,
        job.results?.extractedCount || null, job.results?.translatedCount || null, job.results?.failedCount || null,
        job.error || null, now
      ] as SqlValue[]
    );
    this.save();

    const created = await this.findJobById(id);
    if (!created) throw new Error('Failed to create job');
    return created;
  }

  async updateJob(id: string, updates: Partial<TranslationJob>): Promise<TranslationJob | null> {
    if (!this.db) return null;

    const setClauses: string[] = [];
    const values: SqlValue[] = [];

    if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }
    if (updates.error !== undefined) { setClauses.push('error = ?'); values.push(updates.error); }

    if (updates.progress) {
      setClauses.push('progress_current = ?', 'progress_total = ?', 'progress_status = ?', 'progress_file = ?');
      values.push(updates.progress.current, updates.progress.total, updates.progress.status, updates.progress.currentFile || null);
    }

    if (updates.results) {
      setClauses.push('results_extracted = ?', 'results_translated = ?', 'results_failed = ?');
      values.push(updates.results.extractedCount, updates.results.translatedCount, updates.results.failedCount);
    }

    if (setClauses.length === 0) return this.findJobById(id);

    values.push(id);
    this.db.run(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`, values);
    this.save();

    return this.findJobById(id);
  }

  async deleteJob(id: string): Promise<boolean> {
    if (!this.db) return false;
    this.db.run('DELETE FROM jobs WHERE id = ?', [id] as SqlValue[]);
    this.save();
    return true;
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}