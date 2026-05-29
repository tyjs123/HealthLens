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

export interface AnalyzeResult extends ReportData {}
