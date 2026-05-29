'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReport } from '@/context/report-context';
import { SummaryHeader } from '@/components/summary-header';
import { AbnormalCard } from '@/components/abnormal-card';
import { NormalList } from '@/components/normal-list';
import { TrendChart } from '@/components/trend-chart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Share2, FileUp, Save, History } from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const { state, clearReport, saveToHistory, history } = useReport();

  useEffect(() => {
    if (!state.summary && !state.isLoading) {
      router.push('/');
    }
  }, [state.summary, state.isLoading, router]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'HealthLens 体检报告解读',
          text: state.summary,
        });
      } else {
        await navigator.clipboard.writeText(state.summary);
        toast.success('摘要已复制到剪贴板');
      }
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    saveToHistory();
    toast.success('报告已保存到本地');
  };

  const handleGoToHistory = () => {
    router.push('/history');
  };

  if (!state.summary) return null;

  const sortedAbnormal = [...state.abnormalItems].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.suggestion] - order[b.suggestion];
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 顶部导航 */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearReport();
            router.push('/');
          }}
          className="text-gray-600"
        >
          <FileUp className="mr-1.5 h-4 w-4" />
          重新上传
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoToHistory}
          className="text-gray-600"
        >
          <History className="mr-1.5 h-4 w-4" />
          历史记录
        </Button>
      </div>

      {/* 摘要区 */}
      <SummaryHeader
        summary={state.summary}
        abnormalCount={state.abnormalItems.length}
        reportDate={state.reportDate}
        institution={state.institution}
      />

      {/* 操作按钮 */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleShare} className="h-9">
          <Share2 className="mr-1.5 h-4 w-4" />
          分享摘要
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} className="h-9">
          <Save className="mr-1.5 h-4 w-4" />
          保存到本地
        </Button>
      </div>

      {/* Tabs 切换：指标解读 / 历年趋势 */}
      <Tabs defaultValue="interpretation" className="mt-10">
        <TabsList>
          <TabsTrigger value="interpretation">指标解读</TabsTrigger>
          <TabsTrigger value="trend">历年趋势</TabsTrigger>
        </TabsList>

        <TabsContent value="interpretation" className="mt-6">
          {/* 异常指标 */}
          {sortedAbnormal.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedAbnormal.map((item) => (
                <AbnormalCard key={item.name} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">未发现异常指标，继续保持！</p>
            </div>
          )}

          {/* 正常指标 */}
          {state.normalItems.length > 0 && (
            <div className="mt-4">
              <NormalList items={state.normalItems} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="trend" className="mt-6">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="inline-block h-5 w-1 rounded-full bg-blue-600"></span>
              历年趋势
              {history.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  共 {history.length} 份报告
                </span>
              )}
            </h2>
            <TrendChart history={history} />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}