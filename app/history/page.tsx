'use client';

import { useRouter } from 'next/navigation';
import { useReport } from '@/context/report-context';
import { getHistory, deleteReport } from '@/lib/storage';
import { History, Trash2, FileText, Calendar, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import type { HistoryReport } from '@/types';

interface DeleteConfirmState {
  isOpen: boolean;
  reportId: string | null;
  reportDate: string | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const { setReport, history } = useReport();
  const [reports, setReports] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    reportId: null,
    reportDate: null,
  });

  useEffect(() => {
    setReports(history);
    setLoading(false);
  }, [history]);

  const handleViewReport = (report: HistoryReport) => {
    setReport({
      rawText: '',
      summary: report.fullData?.summary ?? '',
      abnormalItems: report.fullData?.abnormalItems ?? [],
      normalItems: report.fullData?.normalItems ?? [],
      reportDate: report.date,
      institution: report.institution,
      fileName: `历史报告_${report.date}.pdf`,
    });
    router.push('/report');
  };

  const handleDeleteClick = (id: string, date: string) => {
    setDeleteConfirm({ isOpen: true, reportId: id, reportDate: date });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.reportId) {
      deleteReport(deleteConfirm.reportId);
      setReports(getHistory());
    }
    setDeleteConfirm({ isOpen: false, reportId: null, reportDate: null });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, reportId: null, reportDate: null });
  };

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 顶部导航 */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-gray-600"
        >
          ← 返回首页
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">历史记录</h1>
        <div className="w-24" />
      </div>

      {/* 列表 */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <History className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-sm text-gray-500">暂无历史记录</p>
          <p className="mt-1 text-xs text-gray-400">上传并保存体检报告后可在此查看</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="mt-4"
          >
            去上传报告
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                onClick={() => handleViewReport(report)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{report.date}</span>
                    {report.abnormalCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        {report.abnormalCount} 项异常
                      </span>
                    )}
                    {report.abnormalCount === 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                        正常
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    {report.institution && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {report.institution}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {report.date}
                    </span>
                  </div>
                </div>
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(report.id, report.date)}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {reports.length > 0 && (
        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
          共 {reports.length} 份体检报告
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm.isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleCancelDelete}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
            <p className="mt-2 text-sm text-gray-600">
              确定要删除 {deleteConfirm.reportDate} 的体检报告记录吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={handleCancelDelete}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                删除
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}