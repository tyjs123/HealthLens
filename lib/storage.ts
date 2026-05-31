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
  abnormalItems: { name: string; value: string; unit?: string }[],
  normalItems: { name: string; value: string; unit?: string }[]
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

  // 血压特殊处理：120/80 格式，前半为收缩压，后半为舒张压
  const findBP = (names: string[], part: 'first' | 'second') => {
    for (const n of names) {
      const item = all.find((i) => i.name.includes(n));
      if (item) {
        if (item.value.includes('/')) {
          const parts = item.value.split('/');
          const target = part === 'first' ? parts[0] : parts[1];
          const num = parseFloat(target.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) return num;
        } else {
          const num = parseFloat(item.value.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) return num;
        }
      }
    }
    return undefined;
  };

  const heightItem = all.find((i) => i.name.includes('身高'));
  const weightItem = all.find((i) => i.name.includes('体重'));
  let height: number | undefined;
  let weight: number | undefined;
  let bmi: number | undefined;

  if (heightItem) {
    height = parseFloat(heightItem.value.replace(/[^0-9.]/g, ''));
    if (!isNaN(height) && height > 0) {
      const hUnit = String(heightItem.unit || '').toLowerCase();
      // 如果单位是米且数值小于3（如 1.75m），转换为厘米
      if (hUnit.includes('m') && !hUnit.includes('cm') && height < 3) {
        height = height * 100;
      }
    } else {
      height = undefined;
    }
  }

  if (weightItem) {
    weight = parseFloat(weightItem.value.replace(/[^0-9.]/g, ''));
    if (!isNaN(weight) && weight > 0) {
      const wUnit = String(weightItem.unit || '').toLowerCase();
      if (wUnit.includes('g') && !wUnit.includes('kg')) {
        weight = weight / 1000;
      }
    } else {
      weight = undefined;
    }
  }

  if (height && weight && height > 0) {
    const heightM = height / 100;
    bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
  }

  return {
    uricAcid: find(['尿酸']),
    bloodPressureSys: findBP(['收缩压', '高压'], 'first'),
    bloodPressureDia: findBP(['舒张压', '低压'], 'second'),
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