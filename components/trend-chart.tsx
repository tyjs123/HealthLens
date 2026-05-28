'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HistoryReport } from '@/types';

interface TrendChartProps {
  reports: HistoryReport[];
}

const metricNames: Record<string, string> = {
  uricAcid: '尿酸',
  bloodPressureSys: '收缩压',
  bloodPressureDia: '舒张压',
  bloodSugar: '空腹血糖',
  totalCholesterol: '总胆固醇',
  triglycerides: '甘油三酯',
  hdl: '高密度脂蛋白',
  ldl: '低密度脂蛋白',
  alt: '谷丙转氨酶',
  ast: '谷草转氨酶',
  bmi: 'BMI指数',
};

const colors = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#4f46e5',
];

export function TrendChart({ reports }: TrendChartProps) {
  if (reports.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-4 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">暂无趋势数据</p>
        <p className="mt-1 text-xs text-gray-400">
          上传更多历年报告，即可查看指标趋势对比
        </p>
      </div>
    );
  }

  const sorted = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = sorted.map((r) => {
    const point: Record<string, any> = { date: r.date };
    Object.entries(r.coreMetrics).forEach(([key, value]) => {
      if (value !== undefined) point[key] = value;
    });
    return point;
  });

  const availableKeys = Object.keys(metricNames).filter((key) =>
    data.some((d) => d[key] !== undefined)
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
                formatter={(value: any, name: any) => [
                  value,
                  metricNames[name] || name,
                ]}
              />
              <Legend
                formatter={(value: string) => metricNames[value] || value}
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              />
              {availableKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 趋势预警 */}
      <div className="space-y-2">
        {availableKeys.map((key) => {
          const vals = data.map((d) => d[key]).filter((v) => v !== undefined);
          if (vals.length >= 3) {
            const lastTwo = vals.slice(-2);
            if (lastTwo[1] > lastTwo[0]) {
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
                >
                  <span className="text-base">⚠️</span>
                  <span>
                    <span className="font-medium">{metricNames[key]}</span>{' '}
                    持续上升，建议关注
                  </span>
                </div>
              );
            }
          }
          return null;
        })}
      </div>
    </div>
  );
}
