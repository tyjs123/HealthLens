import type { AnalyzeResult } from '@/types';
import { sampleReport } from '@/data/sample-report';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function analyzeReport(text: string): Promise<AnalyzeResult & { isMock?: boolean }> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, _reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}` }),
    });

    // 先尝试解析 JSON，失败则读取原始文本
    let data: any = {};
    let rawText = '';
    try {
      data = await res.json();
    } catch {
      try {
        rawText = await res.text();
      } catch {
        rawText = '';
      }
    }

    // 如果解析出了 data.error，直接抛出
    if (data && data.error) {
      throw new Error(data.error);
    }

    // 如果 HTTP 异常且没有 error 字段，把原始响应也带上
    if (!res.ok) {
      const detail = rawText
        ? rawText.replace(/<[^>]+>/g, '').slice(0, 300)
        : `HTTP ${res.status}`;
      throw new Error(`AI 分析失败 (${res.status}): ${detail}`);
    }

    return data;
  } catch (err: any) {
    // 如果已经抛出了带有错误信息的异常，直接向上抛
    if (err.message && !err.message.includes('AI 分析失败')) {
      throw err;
    }
    // 静态导出或无 API Key 时回退到模拟数据（深拷贝，防止被外部修改污染）
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...deepClone(sampleReport), isMock: true }), 1200);
    });
  }
}
