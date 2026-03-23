/**
 * LLM 路由
 */

import { Router } from 'express';

// 价格单位: 美元/百万token (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // Claude
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  // DeepSeek (估算)
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 }
};

export function llmRoutes(): Router {
  const router = Router();

  router.get('/providers', (req, res) => {
    res.json([
      {
        id: 'deepseek',
        name: 'DeepSeek',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', recommended: true, badge: '💰 最划算' },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', recommended: false }
        ]
      },
      {
        id: 'claude',
        name: 'Anthropic Claude',
        models: [
          { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', recommended: true, badge: '⚡ 性价比' },
          { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', recommended: false },
          { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', recommended: false, badge: '🔥 贵' }
        ]
      },
      {
        id: 'openai',
        name: 'OpenAI',
        models: [
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', recommended: true, badge: '💵 经济' },
          { id: 'gpt-4o', name: 'GPT-4o', recommended: false },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', recommended: false, badge: '🔥 贵' }
        ]
      }
    ]);
  });

  router.get('/pricing', (req, res) => {
    res.json(MODEL_PRICING);
  });

  // 估算翻译成本
  router.post('/estimate', (req, res) => {
    const { textCount, avgTextLength, model } = req.body;

    // 粗略估算: 每条文本约 avgTextLength * 2 token (原文+翻译)
    const estimatedTokens = textCount * avgTextLength * 2;
    const pricing = MODEL_PRICING[model];

    if (!pricing) {
      return res.json({ error: 'Unknown model' });
    }

    // 假设 input:output 比例约 1:1
    const inputTokens = estimatedTokens / 2;
    const outputTokens = estimatedTokens / 2;

    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

    res.json({
      estimatedTokens,
      estimatedCost: cost.toFixed(4),
      currency: 'USD',
      warning: cost > 10 ? '⚠️ 预计费用较高，建议分批处理' : null
    });
  });

  return router;
}