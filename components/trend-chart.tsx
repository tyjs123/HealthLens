'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HistoryReport } from '@/types';

interface TrendChartProps {
  history: HistoryReport[];
}

interface ChartDataPoint {
  year: string;
  [key: string]: string | number | undefined;
}

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  uricAcid: { label: '尿酸', unit: 'μmol/L' },
  bloodPressureSys: { label: '收缩压', unit: 'mmHg' },
  bloodPressureDia: { label: '舒张压', unit: 'mmHg' },
  bloodSugar: { label: '空腹血糖', unit: 'mmol/L' },
  totalCholesterol: { label: '总胆固醇', unit: 'mmol/L' },
  triglycerides: { label: '甘油三酯', unit: 'mmol/L' },
  hdl: { label: '高密度脂蛋白', unit: 'mmol/L' },
  ldl: { label: '低密度脂蛋白', unit: 'mmol/L' },
  alt: { label: '谷丙转氨酶', unit: 'U/L' },
  ast: { label: '谷草转氨酶', unit: 'U/L' },
  bmi: { label: 'BMI', unit: 'kg/m²' },
  wbc: { label: '白细胞计数', unit: '10^9/L' },
  rbc: { label: '红细胞计数', unit: '10^12/L' },
  hemoglobin: { label: '血红蛋白', unit: 'g/L' },
  platelet: { label: '血小板', unit: '10^9/L' },
  heartRate: { label: '心率', unit: '次/分' },
};

function detectTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; warning: string } {
  if (values.length < 2) return { direction: 'stable', warning: '' };

  // history 是 newest-first，前两个元素是最新的
  const recent = values.slice(0, 2);
  if (recent.length < 2) return { direction: 'stable', warning: '' };

  const diff = recent[0] - recent[1];
  const threshold = Math.abs(recent[1]) * 0.05;

  if (Math.abs(diff) < threshold) return { direction: 'stable', warning: '' };

  const direction = diff > 0 ? 'up' : 'down';
  let warning = '';

  if (direction === 'up') {
    warning = '⚠️ 持续上升，建议关注';
  } else if (direction === 'down') {
    warning = '⚠️ 持续下降，建议关注';
  }

  return { direction, warning };
}

export function TrendChart({ history }: TrendChartProps) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return [...history]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((report) => ({
        year: report.date,
        uricAcid: report.coreMetrics.uricAcid,
        bloodPressureSys: report.coreMetrics.bloodPressureSys,
        bloodPressureDia: report.coreMetrics.bloodPressureDia,
        bloodSugar: report.coreMetrics.bloodSugar,
        totalCholesterol: report.coreMetrics.totalCholesterol,
        triglycerides: report.coreMetrics.triglycerides,
        hdl: report.coreMetrics.hdl,
        ldl: report.coreMetrics.ldl,
        alt: report.coreMetrics.alt,
        ast: report.coreMetrics.ast,
        bmi: report.coreMetrics.bmi,
      }));
  }, [history]);

  const metricWarnings = useMemo(() => {
    const warnings: Record<string, string> = {};

    Object.entries(METRIC_LABELS).forEach(([key]) => {
      const values = history
        .map((r) => r.coreMetrics[key])
        .filter((v): v is number => v !== undefined && v !== null);

      const { warning } = detectTrend(values);
      if (warning) {
        warnings[key] = warning;
      }
    });

    return warnings;
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">暂无历史数据</p>
      </div>
    );
  }

  if (history.length === 1) {
    return (
      <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <p className="text-sm text-blue-600">上传更多历年报告，即可查看趋势对比</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(METRIC_LABELS).map(([key, config]) => {
        const values = history.map((r) => r.coreMetrics[key]).filter((v) => v !== undefined);
        if (values.length === 0) return null;

        return (
          <div key={key} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{config.label}</h4>
                {config.unit && (
                  <p className="text-xs text-gray-500">单位: {config.unit}</p>
                )}
              </div>
              {metricWarnings[key] && (
                <span className="text-xs text-amber-600">{metricWarnings[key]}</span>
              )}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [value, config.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={key}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}