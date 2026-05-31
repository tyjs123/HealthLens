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
  try {
    const history = getHistory();
    // 按日期+机构去重，同一天同机构只保留一份
    const exists = history.some(
      (h) => h.date === report.date && h.institution === report.institution
    );
    if (exists) return;
    history.unshift(report);
    // 限制最多保存 50 份，防止超出 localStorage 配额
    if (history.length > 50) history.length = 50;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // QuotaExceededError 或其他存储异常，静默失败避免崩溃
  }
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
  const allValues = all.map((i) => i.value);

  // 方式1：标准格式（name/value/unit/ref 表格）
  const find = (names: string[]) => {
    for (const n of names) {
      const item = all.find((i) => i.name.includes(n));
      if (item) {
        const num = parseFloat(item.value.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return undefined;
  };

  // 方式2：描述式格式（从 value 文本中按正则提取）
  const findInValues = (patterns: RegExp[]): number | undefined => {
    for (const value of allValues) {
      for (const pattern of patterns) {
        const match = value.match(pattern);
        if (match) {
          const num = parseFloat(match[1]);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
    return undefined;
  };

  // 血压特殊处理：120/80 格式
  const findBP = (names: string[], part: 'first' | 'second') => {
    for (const n of names) {
      const item = all.find((i) => i.name.includes(n));
      if (item) {
        if (item.value.includes('/')) {
          const parts = item.value.split('/');
          const target = part === 'first' ? parts[0] : parts[1];
          const num = parseFloat(target.replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) return num;
        } else {
          const num = parseFloat(item.value.replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
    return undefined;
  };

  // 从描述文本中提取血压（如"血压：118/76 mmHg"）
  const extractBPFromText = (): { sys?: number; dia?: number } => {
    for (const value of allValues) {
      const match = value.match(/血压[：:]?\s*(\d+)\s*\/\s*(\d+)/);
      if (match) {
        const sys = parseFloat(match[1]);
        const dia = parseFloat(match[2]);
        if (!isNaN(sys) && !isNaN(dia)) return { sys, dia };
      }
    }
    return {};
  };

  // 身高：支持"身高：175 厘米"、"身高 175cm"等格式
  let height = findInValues([
    /身高[：:]?\s*(\d+\.?\d*)\s*(?:厘米|cm|CM)/,
    /身高\s+(\d+\.?\d*)\s*(?:厘米|cm|CM)/,
  ]) ?? find(['身高']);

  // 体重：支持"体重：68 千克"、"体重 68kg"等格式
  let weight = findInValues([
    /体重[：:]?\s*(\d+\.?\d*)\s*(?:千克|kg|KG)/,
    /体重\s+(\d+\.?\d*)\s*(?:千克|kg|KG)/,
  ]) ?? find(['体重']);

  // 单位标准化
  if (height && height > 0) {
    const heightItem = all.find((i) => i.name.includes('身高'));
    const hUnit = String(heightItem?.unit || '').toLowerCase();
    if (hUnit.includes('m') && !hUnit.includes('cm') && height < 3) {
      height = height * 100;
    }
    // 如果提取到的是米制（如1.75），转换为厘米
    if (height < 3) {
      const heightValue = allValues.find(v => /身高[：:]?\s*1[\.,]\d+/.test(v));
      if (heightValue) height = height * 100;
    }
  }

  if (weight && weight > 0) {
    const weightItem = all.find((i) => i.name.includes('体重'));
    const wUnit = String(weightItem?.unit || '').toLowerCase();
    if (wUnit.includes('g') && !wUnit.includes('kg')) {
      weight = weight / 1000;
    }
  }

  let bmi: number | undefined;
  if (height && weight && height > 0) {
    const heightM = height / 100;
    bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
  }

  // 血压：优先从描述文本提取，其次从标准字段提取
  const bpFromText = extractBPFromText();
  const bloodPressureSys = bpFromText.sys ?? findBP(['收缩压', '高压'], 'first');
  const bloodPressureDia = bpFromText.dia ?? findBP(['舒张压', '低压'], 'second');

  return {
    uricAcid:
      findInValues([/尿酸[：:]?\s*(\d+\.?\d*)/, /尿酸\s+(\d+\.?\d*)/]) ??
      find(['尿酸']),
    bloodPressureSys,
    bloodPressureDia,
    bloodSugar:
      findInValues([/空腹血糖[：:]?\s*(\d+\.?\d*)/, /空腹血糖\s+(\d+\.?\d*)/, /血糖[：:]?\s*(\d+\.?\d*)/]) ??
      find(['空腹血糖', '血糖']),
    totalCholesterol: find(['总胆固醇', '胆固醇']),
    triglycerides: find(['甘油三酯']),
    hdl: find(['高密度脂蛋白']),
    ldl: find(['低密度脂蛋白']),
    alt:
      findInValues([/ALT[：:]?\s*(\d+\.?\d*)/, /ALT\s+(\d+\.?\d*)/, /谷丙转氨酶[：:]?\s*(\d+\.?\d*)/]) ??
      find(['谷丙转氨酶', 'ALT']),
    ast:
      findInValues([/AST[：:]?\s*(\d+\.?\d*)/, /AST\s+(\d+\.?\d*)/, /谷草转氨酶[：:]?\s*(\d+\.?\d*)/]) ??
      find(['谷草转氨酶', 'AST']),
    height,
    weight,
    bmi,
    wbc:
      findInValues([/白细胞[：:]?\s*(\d+\.?\d*)/, /白细胞\s+(\d+\.?\d*)/]) ??
      find(['白细胞计数', '白细胞']),
    rbc:
      findInValues([/红细胞[：:]?\s*(\d+\.?\d*)/, /红细胞\s+(\d+\.?\d*)/]) ??
      find(['红细胞计数', '红细胞']),
    hemoglobin:
      findInValues([/血红蛋白[：:]?\s*(\d+\.?\d*)/, /血红蛋白\s+(\d+\.?\d*)/]) ??
      find(['血红蛋白']),
    platelet:
      findInValues([/血小板[：:]?\s*(\d+\.?\d*)/, /血小板\s+(\d+\.?\d*)/]) ??
      find(['血小板']),
    heartRate:
      findInValues([/心率[：:]?\s*(\d+\.?\d*)/, /心率\s+(\d+\.?\d*)/, /心率\s*(\d+\.?\d*)\s*次/]) ??
      find(['心率']),
  };
}