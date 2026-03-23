/**
 * 统一配置管理
 * 配置来源优先级：环境变量 > .env文件 > 默认值
 */

export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface Config {
  port: number;
  projectsDir: string;
  database: {
    path: string;
  };
  llm: {
    openai: LLMProviderConfig;
    claude: LLMProviderConfig;
    deepseek: LLMProviderConfig;
  };
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3000'),
    projectsDir: process.env.PROJECTS_DIR || './projects',
    database: {
      path: process.env.DB_PATH || './data/localizer.db'
    },
    llm: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL
      },
      claude: {
        apiKey: process.env.ANTHROPIC_API_KEY
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: process.env.DEEPSEEK_BASE_URL
      }
    }
  };
}