import type { ReportData } from '@/types';

export async function analyzeReport(text: string): Promise<ReportData> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI 分析失败，请检查网络或 API 配置');
  }

  return res.json();
}
