# GitHub Project Localizer

AI 驱动的 GitHub 项目汉化工具，支持多模型接入，安全映射策略。

## 功能特性

- **安全映射策略**：生成语言映射文件，不修改源代码逻辑
- **多模型支持**：OpenAI、Claude、DeepSeek、本地模型等
- **智能识别**：自动识别需要翻译的文本（UI字符串、注释、文档）
- **Web UI**：可视化管理项目、审核翻译、查看进度
- **Git集成**：自动拉取项目、管理分支

## 架构

```
src/
├── core/           # 核心逻辑
│   ├── scanner.ts      # 项目扫描器
│   ├── extractor.ts    # 文本提取器
│   ├── translator.ts   # 翻译引擎
│   └── mapper.ts       # 映射生成器
├── llm/            # 大模型适配层
│   ├── base.ts         # 基类
│   ├── openai.ts       # OpenAI
│   ├── claude.ts       # Anthropic
│   └── deepseek.ts     # DeepSeek
├── prompts/        # 内置提示词
├── server/         # Express服务端
└── utils/          # 工具函数

ui/                 # Vue前端界面
```

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

## 翻译策略

### 1. 映射模式（推荐）
生成 `locales/zh-CN.json` 映射文件，项目通过i18n库加载，零侵入。

### 2. 注释模式
仅翻译代码注释、README、文档，不触及业务逻辑。

### 3. 硬编码模式（谨慎）
直接替换字符串字面量，高风险，需人工审核。