'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadZone } from '@/components/upload-zone';
import { useReport } from '@/context/report-context';
import { extractTextFromPdf } from '@/lib/pdf-parser';
import { analyzeReport } from '@/lib/deepseek';
import { sampleReport } from '@/data/sample-report';
import { toast } from 'sonner';
import { Activity, FileSearch, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();
  const { setReport, setLoading, setError, clearReport } = useReport();
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
        const data = await analyzeReport(text);

        setReport({
          rawText: text,
          summary: data.summary,
          abnormalItems: data.abnormalItems || [],
          normalItems: data.normalItems || [],
          fileName: file.name,
        });

        setStatus('生成解读中…');
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
    });
    router.push('/report');
  }, [clearReport, setReport, router]);

  const { state } = useReport();

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
