export interface AbnormalItem {
  name: string;
  value: string;
  unit: string;
  ref: string;
  level: 'slight' | 'moderate' | 'severe';
  plainText: string;
  suggestion: 'green' | 'yellow' | 'red';
}

export interface NormalItem {
  name: string;
  value: string;
  unit: string;
  ref: string;
}

export interface ReportData {
  summary: string;
  abnormalItems: AbnormalItem[];
  normalItems: NormalItem[];
}

export interface CoreMetrics {
  uricAcid?: number;
  bloodPressureSys?: number;
  bloodPressureDia?: number;
  bloodSugar?: number;
  totalCholesterol?: number;
  triglycerides?: number;
  hdl?: number;
  ldl?: number;
  alt?: number;
  ast?: number;
  [key: string]: number | undefined;
}

export interface HistoryReport {
  id: string;
  date: string;
  institution: string;
  summary: string;
  abnormalCount: number;
  coreMetrics: CoreMetrics;
  fullData: ReportData;
}
