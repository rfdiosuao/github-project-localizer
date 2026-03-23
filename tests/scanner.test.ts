import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectScanner } from '../src/core/scanner.js';

describe('ProjectScanner', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'sample-project');

  beforeAll(() => {
    // 创建测试项目结构
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'node_modules', 'some-package'), { recursive: true });

    // 创建测试文件
    fs.writeFileSync(
      path.join(testDir, 'src', 'index.ts'),
      `const message = 'Hello World';
// This is a comment
function greet(name: string) {
  return \`Hello \${name}\`;
}
export { greet };`
    );

    fs.writeFileSync(
      path.join(testDir, 'src', 'config.json'),
      JSON.stringify({ title: 'My App', version: '1.0.0' })
    );

    fs.writeFileSync(
      path.join(testDir, 'README.md'),
      '# Sample Project\n\nThis is a sample project for testing.'
    );

    // node_modules 里的文件应该被忽略
    fs.writeFileSync(
      path.join(testDir, 'node_modules', 'some-package', 'index.js'),
      'const ignored = "This should be ignored";'
    );

    // .gitignore
    fs.writeFileSync(
      path.join(testDir, '.gitignore'),
      'dist/\n*.log\n'
    );
  });

  afterAll(() => {
    // 清理测试文件
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should scan project and find files', async () => {
    const scanner = new ProjectScanner(testDir);
    const files = await scanner.scan();

    expect(files.length).toBeGreaterThan(0);
  });

  it('should ignore node_modules', async () => {
    const scanner = new ProjectScanner(testDir);
    const files = await scanner.scan();

    const nodeModulesFiles = files.filter(f =>
      f.path.includes('node_modules')
    );

    expect(nodeModulesFiles.length).toBe(0);
  });

  it('should identify file types correctly', async () => {
    const scanner = new ProjectScanner(testDir);
    const files = await scanner.scan();

    const tsFile = files.find(f => f.path.endsWith('.ts'));
    const jsonFile = files.find(f => f.path.endsWith('.json'));
    const mdFile = files.find(f => f.path.endsWith('.md'));

    expect(tsFile?.type).toBe('typescript');
    expect(jsonFile?.type).toBe('json');
    expect(mdFile?.type).toBe('markdown');
  });

  it('should filter translatable files', async () => {
    const scanner = new ProjectScanner(testDir);
    const files = await scanner.scan();
    const translatable = scanner.getTranslatableFiles(files);

    translatable.forEach(f => {
      expect(f.translatable).toBe(true);
      expect(f.type).not.toBe('other');
    });
  });

  it('should respect .gitignore patterns', async () => {
    const scanner = new ProjectScanner(testDir);
    const files = await scanner.scan();

    // 创建 dist 目录和文件
    fs.mkdirSync(path.join(testDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'dist', 'bundle.js'), 'compiled code');

    const filesAfterDist = await scanner.scan();
    const distFiles = filesAfterDist.filter(f => f.path.startsWith('dist/'));

    expect(distFiles.length).toBe(0);
  });
});