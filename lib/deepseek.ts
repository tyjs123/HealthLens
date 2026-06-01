import type { AnalyzeResult } from '@/types';
import { sampleReport } from '@/data/sample-report';
import { SYSTEM_PROMPT } from './prompt';
import { extractJson, adaptFormat } from './analyze-utils';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function getApiConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('无法获取 API 配置');
  return res.json() as Promise<{ apiKey: string; provider: string }>;
}

async function callMoonshot(apiKey: string, text: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s 浏览器端不设平台限制

  try {
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `以下是体检报告文本：\n\n${text}` },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Moonshot API 错误 HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || String(data.error));
    }
    return data.choices?.[0]?.message?.content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Moonshot 请求超时（60秒）');
    }
    throw err;
  }
}

async function callDeepSeek(apiKey: string, text: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `以下是体检报告文本：\n\n${text}` },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`DeepSeek API 错误 HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || String(data.error));
    }
    return data.choices?.[0]?.message?.content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('DeepSeek 请求超时（60秒）');
    }
    throw err;
  }
}

export async function analyzeReport(text: string): Promise<AnalyzeResult & { isMock?: boolean }> {
  try {
    const config = await getApiConfig();
    if (!config.apiKey) {
      throw new Error('未配置 API Key');
    }

    let rawContent: string;
    if (config.provider === 'moonshot') {
      rawContent = await callMoonshot(config.apiKey, text);
    } else if (config.provider === 'deepseek') {
      rawContent = await callDeepSeek(config.apiKey, text);
    } else {
      throw new Error(`不支持的 provider: ${config.provider}`);
    }

    // 解析 JSON 并适配格式
    const parsed = extractJson(rawContent);
    const adapted = adaptFormat(parsed, text);

    if (!Array.isArray(adapted.abnormalItems) || !Array.isArray(adapted.normalItems)) {
      throw new Error('AI 返回的数据格式不完整');
    }

    return adapted;
  } catch (err: any) {
    // 只有真正的网络错误（fetch 失败）才 fallback 到模拟数据
    if (err instanceof TypeError || err.name === 'TypeError') {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ ...deepClone(sampleReport), isMock: true }), 1200);
      });
    }
    // 其他 API 错误直接抛出，让上层显示具体报错
    throw err;
  }
}
