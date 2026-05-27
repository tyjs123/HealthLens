'use client';

import { Calendar, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryHeaderProps {
  summary: string;
  abnormalCount: number;
  reportDate?: string;
  institution?: string;
}

export function SummaryHeader({
  summary,
  abnormalCount,
  reportDate,
  institution,
}: SummaryHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            体检报告已解读
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {abnormalCount > 0
              ? `发现 ${abnormalCount} 项异常，建议关注`
              : '各项指标正常，请继续保持'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {reportDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{reportDate}</span>
            </div>
          )}
          {institution && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{institution}</span>
            </div>
          )}
        </div>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">
            {summary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
