<div align="center">

# 🌐 GitHub Project Localizer

**AI 驱动的开源项目汉化工具**

让汉化 GitHub 项目变得简单、安全、低成本

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Test](https://img.shields.io/badge/Tests-49%20passed-brightgreen?style=flat-square)](tests/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[在线演示](#) · [功能特性](#-功能特性) · [快速开始](#-快速开始) · [模型价格对比](#-模型价格对比)

</div>

---

## ✨ 为什么选择 GitHub Project Localizer？

汉化一个 GitHub 项目通常需要：
- 📖 阅读源码，找出所有需要翻译的字符串
- ✏️ 手动翻译成百上千条文本
- 🔧 修改代码，可能引入 bug
- 💰 调用 API 翻译，费用不可控

**GitHub Project Localizer 解决了这些问题：**

| 传统方式 | GitHub Project Localizer |
|---------|-------------------------|
| 手动扫描源码 | 🔍 自动扫描识别可翻译文本 |
| 逐条翻译，费时费力 | ⚡ 批量翻译，效率提升 100x |
| 直接改代码，风险高 | 🛡️ 生成映射文件，零侵入 |
| 费用不可控 | 💰 智能预估，推荐高性价比模型 |

---

## 🚀 功能特性

### 🔍 智能文本识别
自动识别项目中的可翻译文本：
- UI 字符串（按钮、标签、提示信息）
- 代码注释（JSDoc、行内注释）
- 文档文件（Markdown、JSON）

### 🛡️ 安全翻译策略

**映射模式（推荐）**：生成 `locales/zh-CN.json` 文件，通过 i18n 库加载
- ✅ 不修改源代码
- ✅ 支持热更新
- ✅ 易于维护

**内联模式**：直接替换源码字符串（需人工审核）

### 💰 智能费用预估

扫描后自动预估翻译成本，帮你选择最划算的模型：

| 模型 | 1万条文本费用 | 推荐场景 |
|------|-------------|---------|
| DeepSeek Chat | ~$0.20 | 💰 最划算，性价比首选 |
| Claude Haiku | ~$2.40 | ⚡ 速度快，质量高 |
| GPT-3.5 Turbo | ~$1.00 | 💵 经济实惠 |
| GPT-4o | ~$6.25 | 高质量需求 |
| Claude Opus | ~$45.00 | 🔥 预算充足 |

### 🔌 多模型支持

- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude Opus 4.6, Sonnet 4.6, Haiku 4.5
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **自定义**: 支持接入本地模型

### 📊 可视化管理

- Web UI 管理项目
- 实时翻译进度
- 结果预览和审核

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Web UI (Vue 3)                        │
│  项目管理 │ 翻译设置 │ 进度监控 │ 结果预览                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Express)                     │
│  项目管理 API │ 翻译任务 API │ LLM 配置 API                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  核心引擎      │   │  LLM 适配层   │   │  数据存储     │
│               │   │               │   │               │
│ • Scanner     │   │ • OpenAI      │   │ • SQLite      │
│ • Extractor   │   │ • Claude      │   │ • 项目状态     │
│ • Translator  │   │ • DeepSeek    │   │ • 任务记录     │
│ • Mapper      │   │ • 自定义模型   │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 项目结构

```
src/
├── core/                    # 核心引擎
│   ├── scanner.ts          # 项目扫描器
│   ├── extractor.ts        # 文本提取器
│   ├── translator.ts       # 翻译引擎
│   └── mapper.ts           # 映射生成器
├── llm/                     # 大模型适配层
│   ├── base.ts             # 适配器基类
│   ├── openai.ts           # OpenAI 适配器
│   ├── claude.ts           # Claude 适配器
│   └── deepseek.ts         # DeepSeek 适配器
├── prompts/                 # 翻译提示词
├── server/                  # Express 服务端
│   ├── controllers/        # 控制器
│   ├── services/           # 业务逻辑
│   ├── repositories/       # 数据访问
│   └── routes/             # API 路由
└── utils/                   # 工具函数

ui/                          # Vue 3 前端
├── src/
│   └── App.vue             # 主应用
└── vite.config.js          # Vite 配置

tests/                        # 单元测试
├── scanner.test.ts          # 扫描器测试
├── extractor.test.ts        # 提取器测试
├── translator.test.ts       # 翻译器测试
├── mapper.test.ts           # 映射器测试
└── context-manager.test.ts  # 上下文管理测试
```

---

## 📦 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone https://github.com/rfdiosuao/github-project-localizer.git
cd github-project-localizer

# 安装依赖
npm install

# 安装前端依赖
cd ui && npm install && cd ..
```

### 配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# 至少配置一个 LLM 提供商
```

`.env` 文件示例：

```env
# 服务器配置
PORT=3000

# OpenAI (可选)
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# Claude (可选)
CLAUDE_API_KEY=sk-ant-xxx

# DeepSeek (可选，推荐)
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### 启动

```bash
# 开发模式（同时启动前后端）
npm run dev

# 或分别启动
npm run dev:server  # 后端 :3000
npm run dev:ui      # 前端 :5173
```

访问 http://localhost:3000 开始使用！

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

**测试覆盖：**
- `Scanner` - 文件扫描、类型识别、忽略模式
- `Extractor` - 字符串/注释/Markdown/JSON 提取
- `Translator` - 重试机制、验证、上下文管理
- `Mapper` - 映射生成、文件写入
- `ContextManager` - 术语学习、压缩、重置

---

## 📖 使用指南

### 1. 添加项目

- 输入 GitHub URL（自动克隆）
- 或输入本地项目路径

### 2. 扫描项目

点击「扫描项目」，自动识别可翻译文件和文本数量。

### 3. 选择模型

根据费用预估选择合适的模型：
- 💰 **DeepSeek**：最便宜，质量不错
- ⚡ **Claude Haiku**：速度快，性价比高
- 💵 **GPT-3.5**：经济实惠

### 4. 开始翻译

点击「开始翻译」，实时查看进度。

### 5. 查看结果

翻译完成后，映射文件生成在项目的 `locales/zh-CN.json`。

---

## 🔒 安全原则

翻译过程中严格遵循：

- ❌ 不翻译代码逻辑、变量名、API 名称
- ❌ 不修改格式占位符（`%s`, `{name}`, `{{value}}`）
- ❌ 不翻译专有名词（GitHub, npm, API 等）
- ✅ 保留所有代码结构
- ✅ 生成独立的映射文件

---

## 🤝 贡献

欢迎贡献代码、报告 Bug、提出建议！

```bash
# Fork 项目
git clone https://github.com/your-username/github-project-localizer.git

# 创建分支
git checkout -b feature/your-feature

# 提交代码
git commit -m "feat: your feature"

# 推送到 Fork
git push origin feature/your-feature

# 创建 Pull Request
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 👤 作者

<div align="center">

**Heang**

[![Website](https://img.shields.io/badge/Website-heang.top-blue?style=flat-square&logo=google-chrome&logoColor=white)](https://heang.top)
[![GitHub](https://img.shields.io/badge/GitHub-rfdiosuao-black?style=flat-square&logo=github)](https://github.com/rfdiosuao)

如果这个项目对你有帮助，欢迎 ⭐ Star 支持！

</div>

---

<div align="center">

**Made with ❤️ for developers**

</div>