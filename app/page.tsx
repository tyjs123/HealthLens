'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadZone } from '@/components/upload-zone';
import { useReport } from '@/context/report-context';
import { extractTextFromPdf } from '@/lib/pdf-parser';
import { analyzeReport } from '@/lib/deepseek';
import { saveReport, extractCoreMetrics } from '@/lib/storage';
import { extractDate } from '@/lib/extract-date';
import { sampleReport } from '@/data/sample-report';
import type { HistoryReport } from '@/types';
import { toast } from 'sonner';
import { Activity, FileSearch, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnalyzeResult } from '@/types';

// BMI 兜底计算：如果 AI 没返回 BMI，前端根据身高体重自动计算
function ensureBMI(report: { abnormalItems: any[]; normalItems: any[] }) {
  const all = [...report.abnormalItems, ...report.normalItems];
  if (all.some((i) => i.name === 'BMI指数')) return;

  const heightItem = all.find((i) => i.name.includes('身高'));
  const weightItem = all.find((i) => i.name.includes('体重'));
  if (!heightItem || !weightItem) return;

  let height = parseFloat(String(heightItem.value).replace(/[^0-9.]/g, ''));
  let weight = parseFloat(String(weightItem.value).replace(/[^0-9.]/g, ''));
  if (isNaN(height) || isNaN(weight) || height <= 0) return;

  // 单位标准化
  const hUnit = String(heightItem.unit || '').toLowerCase();
  const wUnit = String(weightItem.unit || '').toLowerCase();
  if (hUnit.includes('m') && !hUnit.includes('cm')) height *= 100;
  if (wUnit.includes('g') && !wUnit.includes('kg')) weight /= 1000;

  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  const base = { name: 'BMI指数', value: String(bmi), unit: 'kg/m²', ref: '18.5-23.9' };

  if (bmi < 18.5) {
    report.abnormalItems.push({
      ...base,
      level: 'slight',
      plainText: 'BMI低于正常范围，体重偏轻，建议增加营养摄入并适当增肌。',
      suggestion: 'yellow',
    });
  } else if (bmi <= 23.9) {
    report.normalItems.push(base);
  } else if (bmi <= 27.9) {
    report.abnormalItems.push({
      ...base,
      level: 'slight',
      plainText: 'BMI处于超重范围，建议控制饮食热量并增加有氧运动。',
      suggestion: 'yellow',
    });
  } else {
    report.abnormalItems.push({
      ...base,
      level: 'moderate',
      plainText: 'BMI达到肥胖标准，可能增加心血管疾病和糖尿病风险，建议制定科学减重计划。',
      suggestion: 'yellow',
    });
  }
}

export default function HomePage() {
  const router = useRouter();
  const { state, setReport, setLoading, setError, clearReport } = useReport();
  const [status, setStatus] = useState('');

  const handleUpload = useCallback(
    async (file: File) => {
      clearReport();

      if (file.size > 15 * 1024 * 1024) {
        toast.error('文件过大（>15MB），请压缩后重试');
        return;
      }
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        toast.error('暂仅支持 PDF 格式体检报告');
        return;
      }

      setLoading(true);
      setStatus('正在提取文本…');

      try {
        const text = await extractTextFromPdf(file);
        if (!text || text.length < 50) {
          setError('无法识别此 PDF，可能是扫描件或图片版，请使用文字版体检报告');
          toast.error('无法识别此 PDF，可能是扫描件或图片版，请使用文字版体检报告');
          return;
        }

        setStatus('AI 分析中…');
        const data: AnalyzeResult = await analyzeReport(text);
        ensureBMI(data);

        // 优先使用 AI 提取的日期，若为空则从 PDF 文本中兜底提取
        const reportDate = data.reportDate?.trim() || extractDate(text) || '';

        // 如果包含多年报告数据，自动保存各年份到历史记录
        if (data.yearlyReports && data.yearlyReports.length > 0) {
          // 从各年份内容中尝试提取更精确的日期
          const getYearDate = (yr: any) => {
            if (yr.year?.trim()) return yr.year.trim();
            // 从该年份的指标中尝试找日期
            const allItems = [...(yr.abnormalItems || []), ...(yr.normalItems || [])];
            for (const item of allItems) {
              if (item.value && /^\d{4}[\-/年]/.test(item.value)) {
                return item.value;
              }
            }
            return '';
          };

          for (const yr of data.yearlyReports) {
            const yrDate = getYearDate(yr) || reportDate || '';
            const report: HistoryReport = {
              id: `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`,
              date: yrDate,
              institution: data.institution || '',
              summary: yr.summary || data.summary,
              abnormalCount: yr.abnormalItems.length,
              coreMetrics: extractCoreMetrics(yr.abnormalItems, yr.normalItems),
              fullData: {
                summary: yr.summary || data.summary,
                abnormalItems: yr.abnormalItems,
                normalItems: yr.normalItems,
              },
            };
            saveReport(report);
          }
          toast.success(`已自动保存 ${data.yearlyReports.length} 份历年报告`);
        }

        setReport({
          rawText: text,
          summary: data.summary,
          abnormalItems: data.abnormalItems || [],
          normalItems: data.normalItems || [],
          fileName: file.name,
          reportDate,
          institution: data.institution || '',
        });

        setStatus('生成解读中…');
        toast.success('分析完成，正在生成解读…');
        router.push('/report');
      } catch (err: any) {
        const msg = err.message || '报告解析异常，请重试或更换报告';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setStatus('');
      }
    },
    [clearReport, setLoading, setError, setReport, router]
  );

  const handleSample = useCallback(() => {
    clearReport();
    setReport({
      summary: sampleReport.summary,
      abnormalItems: sampleReport.abnormalItems,
      normalItems: sampleReport.normalItems,
      fileName: '示例报告.pdf',
      reportDate: '2024-03-15',
      institution: '示例体检中心',
    });
    router.push('/report');
  }, [clearReport, setReport, router]);



  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-blue-600 p-3">
          <Activity className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          HealthLens
        </h1>
        <p className="mt-2 text-lg text-gray-600">体检报告 AI 解读官</p>
        <p className="mt-4 text-sm text-gray-500">
          3 分钟读懂你的体检报告
        </p>
      </div>

      <div className="mb-6">
        <UploadZone
          onUpload={handleUpload}
          loading={state.isLoading}
          statusText={status}
        />
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSample}
          disabled={state.isLoading}
        >
          <FileSearch className="mr-1.5 h-4 w-4" />
          没有报告？试用示例
        </Button>
      </div>

      <div className="mt-8 flex items-center justify-center gap-1 text-xs text-gray-400">
        <span>当前适配：</span>
        <span>美年大健康</span>
        <ChevronRight className="h-3 w-3" />
        <span>爱康国宾</span>
        <ChevronRight className="h-3 w-3" />
        <span>公立医院标准版式</span>
      </div>

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
        <strong>免责声明：</strong>
        本工具仅提供体检报告信息整理与健康科普，不构成医疗诊断或治疗建议，如有不适请及时就医。
      </div>
    </div>
  );
}
