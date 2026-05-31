import type { AnalyzeResult } from '@/types';
import { sampleReport } from '@/data/sample-report';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function analyzeReport(text: string): Promise<AnalyzeResult> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, _reqId: `${Date.now()}_${Math.random().toString(36).slice(2)}` }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'AI 分析失败');
    }

    return res.json();
  } catch {
    // 静态导出或无 API Key 时回退到模拟数据（深拷贝，防止被外部修改污染）
    return new Promise((resolve) => {
      setTimeout(() => resolve(deepClone(sampleReport)), 1200);
    });
  }
}
