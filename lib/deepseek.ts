import type { ReportData } from '@/types';
import { sampleReport } from '@/data/sample-report';

export async function analyzeReport(text: string): Promise<ReportData> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'AI 分析失败');
    }

    return res.json();
  } catch {
    // 静态导出或无 API Key 时回退到模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(sampleReport), 1200);
    });
  }
}
