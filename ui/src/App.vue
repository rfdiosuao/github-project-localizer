<template>
  <div class="app">
    <header class="header">
      <h1>🌐 GitHub 项目汉化工具</h1>
      <p class="subtitle">AI驱动，安全映射，多模型支持</p>
    </header>

    <main class="main">
      <!-- 新建项目 -->
      <section class="card">
        <h2>📥 添加项目</h2>
        <div class="form-group">
          <label>GitHub URL 或本地路径</label>
          <input
            v-model="newProject.path"
            placeholder="https://github.com/user/repo 或 D:/projects/my-repo"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>项目名称（可选）</label>
            <input v-model="newProject.name" placeholder="自动从URL提取" />
          </div>
        </div>
        <button @click="addProject" :disabled="loading" class="btn-primary">
          {{ loading ? '处理中...' : '添加项目' }}
        </button>
      </section>

      <!-- 项目列表 -->
      <section class="card" v-if="projects.length">
        <h2>📁 项目列表</h2>
        <div class="projects">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-item"
            :class="{ active: selectedProject?.id === project.id }"
            @click="selectProject(project)"
          >
            <div class="project-header">
              <span class="project-name">{{ project.name }}</span>
              <span class="status-badge" :class="project.status">
                {{ statusLabels[project.status] || project.status }}
              </span>
            </div>
            <div class="project-meta">
              {{ project.url || project.localPath }}
            </div>
          </div>
        </div>
      </section>

      <!-- 项目详情和翻译控制 -->
      <section class="card" v-if="selectedProject">
        <h2>⚙️ 翻译设置</h2>

        <div class="form-row">
          <div class="form-group">
            <label>输出模式</label>
            <select v-model="translateSettings.outputMode">
              <option value="locale">生成映射文件（推荐）</option>
              <option value="inline">内联替换（高风险）</option>
              <option value="both">两者都要</option>
            </select>
          </div>

          <div class="form-group">
            <label>大模型选择</label>
            <select v-model="translateSettings.provider" @change="updateModels">
              <option v-for="p in providers" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>模型</label>
            <select v-model="translateSettings.model">
              <option
                v-for="m in availableModels"
                :key="m.id"
                :value="m.id"
              >
                {{ m.name }}{{ m.badge ? ` ${m.badge}` : '' }}
              </option>
            </select>
            <p class="model-hint" v-if="selectedModelInfo?.recommended">
              ✅ 推荐模型，性价比高
            </p>
          </div>
        </div>

        <!-- 费用预估 -->
        <div v-if="scanResult" class="cost-estimate">
          <h4>💰 费用预估</h4>
          <p v-if="costEstimate">
            预计消耗约 <strong>{{ costEstimate.estimatedTokens.toLocaleString() }}</strong> tokens，
            费用约 <strong>${{ costEstimate.estimatedCost }}</strong> USD
            <span v-if="costEstimate.warning" class="warning">{{ costEstimate.warning }}</span>
          </p>
          <p class="cost-tip">💡 提示：DeepSeek 最便宜，Claude Haiku 性价比高</p>
        </div>

        <div class="actions">
          <button
            @click="scanProject"
            :disabled="scanning"
            class="btn-secondary"
          >
            {{ scanning ? '扫描中...' : '🔍 扫描项目' }}
          </button>

          <button
            @click="startTranslation"
            :disabled="translating || !scanResult"
            class="btn-primary"
          >
            {{ translating ? '翻译中...' : '🚀 开始翻译' }}
          </button>
        </div>

        <!-- 扫描结果 -->
        <div v-if="scanResult" class="scan-result">
          <h3>扫描结果</h3>
          <div class="stats">
            <div class="stat">
              <span class="stat-value">{{ scanResult.totalFiles }}</span>
              <span class="stat-label">总文件数</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ scanResult.translatableFiles }}</span>
              <span class="stat-label">可翻译</span>
            </div>
          </div>
        </div>

        <!-- 翻译进度 -->
        <div v-if="currentJob" class="progress-section">
          <h3>翻译进度</h3>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
          <div class="progress-text">
            {{ currentJob.progress.current }} / {{ currentJob.progress.total }}
            <span v-if="currentJob.progress.currentFile">
              - {{ currentJob.progress.currentFile }}
            </span>
          </div>

          <div v-if="currentJob.results" class="results">
            <h4>完成!</h4>
            <p>✅ 成功翻译: {{ currentJob.results.translatedCount }}</p>
            <p>❌ 失败: {{ currentJob.results.failedCount }}</p>
          </div>
        </div>
      </section>

      <!-- 使用说明 -->
      <section class="card">
        <h2>📖 使用说明</h2>
        <div class="docs">
          <h3>翻译策略</h3>
          <ul>
            <li><strong>映射模式（推荐）</strong>：生成 <code>locales/zh-CN.json</code> 文件，项目通过 i18n 库加载，零侵入</li>
            <li><strong>内联模式</strong>：直接替换源码中的字符串，高风险，需人工审核</li>
          </ul>

          <h3>支持的文件类型</h3>
          <p>JavaScript, TypeScript, Vue, React, JSON, Markdown, YAML, HTML, CSS</p>

          <h3>安全原则</h3>
          <ul>
            <li>不翻译代码逻辑、变量名、API名称</li>
            <li>保留所有格式占位符（%s, {name}, {{value}}）</li>
            <li>保留专有名词（GitHub, npm, API等）</li>
          </ul>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>Made with ❤️ for developers</p>
    </footer>
  </div>
</template>

<script>
import axios from 'axios';

const API = 'http://localhost:3000/api';

export default {
  data() {
    return {
      loading: false,
      scanning: false,
      translating: false,
      projects: [],
      providers: [],
      selectedProject: null,
      scanResult: null,
      currentJob: null,
      newProject: {
        path: '',
        name: ''
      },
      translateSettings: {
        outputMode: 'locale',
        provider: 'deepseek',
        model: 'deepseek-chat'
      },
      costEstimate: null,
      statusLabels: {
        pending: '待处理',
        cloning: '克隆中',
        scanning: '扫描中',
        extracting: '提取中',
        translating: '翻译中',
        complete: '已完成',
        error: '出错'
      }
    };
  },
  computed: {
    availableModels() {
      const provider = this.providers.find(p => p.id === this.translateSettings.provider);
      return provider?.models || [];
    },
    selectedModelInfo() {
      return this.availableModels.find(m => m.id === this.translateSettings.model);
    },
    progressPercent() {
      if (!this.currentJob || !this.currentJob.progress.total) return 0;
      return Math.round(
        (this.currentJob.progress.current / this.currentJob.progress.total) * 100
      );
    }
  },
  watch: {
    'translateSettings.model'() {
      if (this.scanResult) {
        this.estimateCost();
      }
    }
  },
  async mounted() {
    await this.loadProjects();
    await this.loadProviders();
  },
  methods: {
    async loadProjects() {
      try {
        const { data } = await axios.get(`${API}/projects`);
        this.projects = data;
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
    },
    async loadProviders() {
      try {
        const { data } = await axios.get(`${API}/llm/providers`);
        this.providers = data;
      } catch (e) {
        console.error('Failed to load providers:', e);
      }
    },
    updateModels() {
      const provider = this.providers.find(p => p.id === this.translateSettings.provider);
      if (provider?.models?.length) {
        // 优先选择推荐的模型
        const recommended = provider.models.find(m => m.recommended);
        this.translateSettings.model = recommended ? recommended.id : provider.models[0].id;
      }
      this.costEstimate = null;
    },
    async estimateCost() {
      if (!this.scanResult || !this.translateSettings.model) return;

      try {
        const { data } = await axios.post(`${API}/llm/estimate`, {
          textCount: this.scanResult.translatableFiles * 20, // 粗略估算每个文件20条文本
          avgTextLength: 50,
          model: this.translateSettings.model
        });
        this.costEstimate = data;
      } catch (e) {
        console.error('Cost estimation failed:', e);
      }
    },
    async addProject() {
      if (!this.newProject.path.trim()) return;

      this.loading = true;
      try {
        const isUrl = this.newProject.path.startsWith('http');
        const { data } = await axios.post(`${API}/projects`, {
          url: isUrl ? this.newProject.path : undefined,
          localPath: !isUrl ? this.newProject.path : undefined,
          name: this.newProject.name || undefined
        });

        this.projects.unshift(data);
        this.newProject = { path: '', name: '' };
        this.selectProject(data);
      } catch (e) {
        alert('添加项目失败: ' + (e.response?.data?.error || e.message));
      } finally {
        this.loading = false;
      }
    },
    selectProject(project) {
      this.selectedProject = project;
      this.scanResult = null;
      this.currentJob = null;
    },
    async scanProject() {
      if (!this.selectedProject) return;

      this.scanning = true;
      try {
        const { data } = await axios.post(
          `${API}/projects/${this.selectedProject.id}/scan`
        );
        this.scanResult = data;
        await this.estimateCost();
      } catch (e) {
        alert('扫描失败: ' + (e.response?.data?.error || e.message));
      } finally {
        this.scanning = false;
      }
    },
    async startTranslation() {
      if (!this.selectedProject || !this.scanResult) return;

      this.translating = true;
      try {
        const { data: job } = await axios.post(
          `${API}/projects/${this.selectedProject.id}/translate`,
          {
            outputMode: this.translateSettings.outputMode,
            llmConfig: {
              provider: this.translateSettings.provider,
              model: this.translateSettings.model
            }
          }
        );

        this.currentJob = job;
        this.pollJobStatus(job.id);
      } catch (e) {
        alert('翻译启动失败: ' + (e.response?.data?.error || e.message));
        this.translating = false;
      }
    },
    async pollJobStatus(jobId) {
      const poll = async () => {
        try {
          const { data: job } = await axios.get(`${API}/jobs/${jobId}`);
          this.currentJob = job;

          if (job.status === 'running') {
            setTimeout(poll, 1000);
          } else {
            this.translating = false;
            await this.loadProjects();
          }
        } catch (e) {
          console.error('Poll error:', e);
          this.translating = false;
        }
      };

      await poll();
    }
  }
};
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #94a3b8;
  margin-top: 0.5rem;
}

.main {
  display: grid;
  gap: 1.5rem;
}

.card {
  background: #1e293b;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #334155;
}

.card h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #f1f5f9;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #94a3b8;
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

input, select {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 1rem;
}

input:focus, select:focus {
  outline: none;
  border-color: #60a5fa;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
}

.btn-secondary:hover:not(:disabled) {
  background: #334155;
  color: #e2e8f0;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.projects {
  display: grid;
  gap: 0.75rem;
}

.project-item {
  padding: 1rem;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.project-item:hover {
  border-color: #60a5fa;
}

.project-item.active {
  border-color: #60a5fa;
  background: #1e3a5f;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-name {
  font-weight: 500;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: #334155;
}

.status-badge.complete {
  background: #166534;
  color: #86efac;
}

.status-badge.error {
  background: #991b1b;
  color: #fca5a5;
}

.status-badge.translating,
.status-badge.scanning {
  background: #1e40af;
  color: #93c5fd;
}

.project-meta {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
  word-break: break-all;
}

.scan-result {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #334155;
}

.stats {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #60a5fa;
}

.stat-label {
  font-size: 0.875rem;
  color: #94a3b8;
}

.progress-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #334155;
}

.progress-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.875rem;
  color: #94a3b8;
}

.results {
  margin-top: 1rem;
  padding: 1rem;
  background: #0f172a;
  border-radius: 8px;
}

.results p {
  margin: 0.5rem 0;
}

.docs {
  color: #94a3b8;
  line-height: 1.8;
}

.docs h3 {
  color: #e2e8f0;
  margin: 1rem 0 0.5rem;
}

.docs h3:first-child {
  margin-top: 0;
}

.docs ul {
  margin-left: 1.5rem;
}

.docs li {
  margin: 0.5rem 0;
}

.docs code {
  background: #334155;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #f1f5f9;
}

.model-hint {
  font-size: 0.75rem;
  color: #4ade80;
  margin-top: 0.25rem;
}

.cost-estimate {
  margin-top: 1rem;
  padding: 1rem;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
}

.cost-estimate h4 {
  margin-bottom: 0.5rem;
  color: #f1f5f9;
}

.cost-estimate p {
  color: #94a3b8;
  margin: 0.25rem 0;
}

.cost-estimate strong {
  color: #60a5fa;
}

.cost-estimate .warning {
  display: block;
  margin-top: 0.5rem;
  color: #fbbf24;
}

.cost-tip {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.footer {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}
</style>