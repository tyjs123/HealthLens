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

    const data = await res.json().catch(() => ({}));

    // 后端返回了明确的错误信息
    if (data.error) {
      throw new Error(data.error);
    }

    // HTTP 状态码异常但没有 error 字段
    if (!res.ok) {
      throw new Error('AI 分析服务暂时不可用，请稍后重试');
    }

    return data;
  } catch (err: any) {
    // 如果已经抛出了带有错误信息的异常，直接向上抛
    if (err.message && err.message !== 'AI 分析失败') {
      throw err;
    }
    // 静态导出或无 API Key 时回退到模拟数据（深拷贝，防止被外部修改污染）
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...deepClone(sampleReport), isMock: true }), 1200);
    });
  }
}
