import type { HistoryReport, CoreMetrics } from '@/types';

const STORAGE_KEY = 'healthlens_reports';

export function getHistory(): HistoryReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveReport(report: HistoryReport): void {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  history.unshift(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function deleteReport(id: string): void {
  if (typeof window === 'undefined') return;
  const history = getHistory().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearAll(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function extractCoreMetrics(
  abnormalItems: { name: string; value: string }[],
  normalItems: { name: string; value: string }[]
): CoreMetrics {
  const all = [...abnormalItems, ...normalItems];
  const find = (names: string[]) => {
    for (const n of names) {
      const item = all.find((i) => i.name.includes(n));
      if (item) {
        const num = parseFloat(item.value.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    return undefined;
  };

  const height = find(['身高']);
  const weight = find(['体重']);
  let bmi: number | undefined;
  if (height && weight && height > 0) {
    const heightM = height / 100;
    bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
  }

  return {
    uricAcid: find(['尿酸']),
    bloodPressureSys: find(['收缩压', '高压']),
    bloodPressureDia: find(['舒张压', '低压']),
    bloodSugar: find(['空腹血糖', '血糖']),
    totalCholesterol: find(['总胆固醇', '胆固醇']),
    triglycerides: find(['甘油三酯']),
    hdl: find(['高密度脂蛋白']),
    ldl: find(['低密度脂蛋白']),
    alt: find(['谷丙转氨酶', 'ALT']),
    ast: find(['谷草转氨酶', 'AST']),
    height,
    weight,
    bmi,
  };
}
