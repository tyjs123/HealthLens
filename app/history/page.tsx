'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReport } from '@/context/report-context';
import { getHistory, deleteReport, clearAll } from '@/lib/storage';
import type { HistoryReport } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ArrowLeft, MoreVertical, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function HistoryPage() {
  const router = useRouter();
  const { setReport } = useReport();
  const [history, setHistory] = useState<HistoryReport[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleView = (report: HistoryReport) => {
    setReport({
      summary: report.fullData.summary,
      abnormalItems: report.fullData.abnormalItems,
      normalItems: report.fullData.normalItems,
      reportDate: report.date,
      institution: report.institution,
    });
    router.push('/report');
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    setHistory(getHistory());
    toast.success('已删除');
  };

  const handleClearAll = () => {
    clearAll();
    setHistory([]);
    toast.success('已清空所有本地数据');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="-ml-2 mb-4 text-gray-600">
        <ArrowLeft className="mr-1 h-4 w-4" />
        返回首页
      </Button>

      <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
      <p className="mt-1 text-sm text-gray-500">本地存储的所有报告</p>

      <div className="mt-6 space-y-3">
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">暂无历史记录</p>
          </div>
        ) : (
          history.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer transition-colors hover:bg-gray-50"
              onClick={() => handleView(report)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {report.date} · {report.institution}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {report.abnormalCount > 0
                      ? `发现 ${report.abnormalCount} 项异常`
                      : '各项指标正常'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(report.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                清空所有本地数据
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认清空？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除所有本地存储的体检报告数据，无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
                  确认清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
