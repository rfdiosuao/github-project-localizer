import { glob } from 'glob';
import ignore from 'ignore';
import * as fs from 'fs';
import * as path from 'path';

export interface ScanResult {
  path: string;
  type: FileType;
  size: number;
  translatable: boolean;
}

export type FileType =
  | 'javascript'
  | 'typescript'
  | 'vue'
  | 'react'
  | 'json'
  | 'markdown'
  | 'yaml'
  | 'html'
  | 'css'
  | 'other';

const FILE_EXTENSIONS: Record<string, FileType> = {
  '.js': 'javascript',
  '.jsx': 'react',
  '.ts': 'typescript',
  '.tsx': 'react',
  '.vue': 'vue',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css'
};

const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  '*.min.js',
  '*.min.css',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
];

export class ProjectScanner {
  private projectPath: string;
  private ig: ReturnType<typeof ignore>;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.ig = ignore().add(IGNORE_PATTERNS);

    // 尝试加载 .gitignore
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      this.ig.add(gitignore.split('\n').filter(line => line && !line.startsWith('#')));
    }
  }

  async scan(): Promise<ScanResult[]> {
    // 规范化路径（Windows兼容）
    const normalizedPath = this.projectPath.replace(/\//g, path.sep);

    const files = await glob('**/*', {
      cwd: normalizedPath,
      nodir: true,
      dot: false,
      absolute: false,
      follow: false
    });

    console.log(`Scanned ${normalizedPath}: found ${files.length} files`);

    const results: ScanResult[] = [];

    for (const file of files) {
      if (this.ig.ignores(file)) continue;

      const fullPath = path.join(this.projectPath, file);
      const ext = path.extname(file).toLowerCase();
      const type = FILE_EXTENSIONS[ext] || 'other';
      const stats = fs.statSync(fullPath);

      results.push({
        path: file,
        type,
        size: stats.size,
        translatable: type !== 'other' && stats.size < 500 * 1024 // 限制500KB
      });
    }

    return results;
  }

  getTranslatableFiles(files: ScanResult[]): ScanResult[] {
    return files.filter(f => f.translatable);
  }

  getFilesByType(files: ScanResult[], type: FileType): ScanResult[] {
    return files.filter(f => f.type === type);
  }
}