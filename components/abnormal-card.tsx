'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AbnormalItem } from '@/types';
import hospitals from '@/data/hospitals.json';

interface AbnormalCardProps {
  item: AbnormalItem;
}

const suggestionConfig = {
  green: {
    label: '生活方式调整',
    badge: 'bg-green-50 text-green-700 border-green-200',
    border: 'border-l-green-500',
  },
  yellow: {
    label: '定期复查',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    border: 'border-l-yellow-500',
  },
  red: {
    label: '建议就医',
    badge: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-l-red-500',
  },
};

const levelMap = {
  slight: '轻微异常',
  moderate: '中度异常',
  severe: '严重异常',
};

export function AbnormalCard({ item }: AbnormalCardProps) {
  const config = suggestionConfig[item.suggestion];

  return (
    <Card className={`overflow-hidden border border-gray-100 border-l-4 ${config.border} shadow-sm`}>
      <CardContent className="p-0">
        {/* 头部：指标信息 + 建议标签 */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-50 p-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-bold text-red-600">{item.value}</span>
              <span className="text-sm text-gray-500">{item.unit}</span>
              <span className="text-xs text-gray-400">参考范围 {item.ref || '未标注'}</span>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${config.badge}`}>
            {config.label}
          </Badge>
        </div>

        {/* 人话翻译 */}
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed text-gray-700">{item.plainText}</p>
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5">
          <span className="text-xs text-gray-400">
            异常程度：<span className="font-medium text-gray-600">{levelMap[item.level]}</span>
          </span>
        </div>

        {/* 建议就医时显示医院 */}
        {item.suggestion === 'red' && (
          <div className="border-t border-red-100 bg-red-50/50 px-4 py-3">
            <p className="text-sm font-medium text-red-800">建议就诊：内分泌科</p>
            <div className="mt-2 space-y-1.5">
              {hospitals.slice(0, 3).map((h) => (
                <div key={h.name} className="text-xs text-red-700/90">
                  <span className="font-medium">{h.name}</span>
                  <span className="mx-1 text-red-400">·</span>
                  <span className="text-red-600/80">{h.distance}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
