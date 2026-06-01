import { extractDate } from './extract-date';

export function extractInstitution(text: string): string {
  const patterns = [
    /(?:体检中心|医院|体检机构)[：:]\s*([^\n\r\d]{2,20})/i,
    /(美年大健康|爱康国宾|慈铭|瑞慈|美兆)[^\n\r]*/i,
    /^([^\n\r]{5,30}体检[中心医院])/im,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

export function adaptFormat(raw: any, text?: string) {
  const result: any = {
    summary: '',
    abnormalItems: [],
    normalItems: [],
    yearlyReports: [],
    reportDate: '',
    institution: '',
  };

  if (typeof raw.summary === 'string') result.summary = raw.summary;
  else if (Array.isArray(raw.summary)) result.summary = raw.summary.join('');

  const abnormals = raw.abnormalItems || raw.abnormals || raw.abnormal || [];
  result.abnormalItems = abnormals.map((item: any) => ({
    name: String(item.name || ''),
    value: String(item.value ?? ''),
    unit: String(item.unit || ''),
    ref: String(item.ref || item.reference || ''),
    level: ['slight', 'moderate', 'severe'].includes(item.level) ? item.level : 'slight',
    plainText: String(item.plainText || item.explanation || item.description || ''),
    suggestion: ['green', 'yellow', 'red'].includes(item.suggestion) ? item.suggestion : 'yellow',
  }));

  const normals = raw.normalItems || raw.normals || raw.normal || [];
  result.normalItems = normals.map((item: any) => ({
    name: String(item.name || ''),
    value: String(item.value ?? ''),
    unit: String(item.unit || ''),
    ref: String(item.ref || item.reference || ''),
  }));

  if (Array.isArray(raw.yearlyReports)) {
    result.yearlyReports = raw.yearlyReports.map((yr: any) => ({
      year: String(yr.year || ''),
      summary: typeof yr.summary === 'string' ? yr.summary : result.summary,
      abnormalItems: (yr.abnormalItems || yr.abnormals || yr.abnormal || []).map((item: any) => ({
        name: String(item.name || ''),
        value: String(item.value ?? ''),
        unit: String(item.unit || ''),
        ref: String(item.ref || item.reference || ''),
        level: ['slight', 'moderate', 'severe'].includes(item.level) ? item.level : 'slight',
        plainText: String(item.plainText || item.explanation || item.description || ''),
        suggestion: ['green', 'yellow', 'red'].includes(item.suggestion) ? item.suggestion : 'yellow',
      })),
      normalItems: (yr.normalItems || yr.normals || yr.normal || []).map((item: any) => ({
        name: String(item.name || ''),
        value: String(item.value ?? ''),
        unit: String(item.unit || ''),
        ref: String(item.ref || item.reference || ''),
      })),
    })).filter((yr: any) => yr.abnormalItems.length > 0 || yr.normalItems.length > 0);
  }

  if (raw.reportDate && typeof raw.reportDate === 'string') result.reportDate = raw.reportDate;
  if (!result.reportDate && text) result.reportDate = extractDate(text);
  if (raw.institution && typeof raw.institution === 'string') result.institution = raw.institution;
  if (!result.institution && text) result.institution = extractInstitution(text);

  return result;
}

export function repairJson(text: string): string {
  let repaired = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!inString) {
      if (char === '"') {
        inString = true;
        repaired += char;
      } else if (char === '\n' || char === '\r') {
        repaired += ' ';
      } else {
        repaired += char;
      }
    } else {
      if (escaped) {
        repaired += char;
        escaped = false;
      } else if (char === '\\') {
        repaired += char;
        escaped = true;
      } else if (char === '"') {
        inString = false;
        repaired += char;
      } else if (char === '\n' || char === '\r') {
        repaired += ' ';
      } else {
        repaired += char;
      }
    }
  }

  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  if (openBraces > closeBraces) repaired += '}'.repeat(openBraces - closeBraces);
  if (openBrackets > closeBrackets) repaired += ']'.repeat(openBrackets - closeBrackets);
  return repaired;
}

export function extractJson(text: string): any {
  const candidates: string[] = [];
  candidates.push(text);
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) candidates.push(codeMatch[1].trim());
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }
  const braceMatch = text.match(/\{[\s\S]*?\}/);
  if (braceMatch) candidates.push(braceMatch[0]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(repairJson(candidate));
      } catch {
        // continue
      }
    }
  }
  throw new Error('无法解析 JSON');
}

export function tryExtractFromRawText(aiText: string, originalText: string): any | null {
  try {
    const result: any = {
      summary: '',
      abnormalItems: [],
      normalItems: [],
      yearlyReports: [],
      reportDate: extractDate(originalText),
      institution: extractInstitution(originalText),
    };
    const summaryMatch = aiText.match(/(?:整体|摘要|总结|概述)[：:]?\s*([^\n]{10,200})/);
    if (summaryMatch) result.summary = summaryMatch[1].trim();
    else result.summary = aiText.replace(/\s+/g, ' ').slice(0, 150).trim();

    const lines = aiText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/(异常|偏高|偏低|超标|不合格|升高|降低|过重|肥胖|近视|不足|减少|阳性)/.test(trimmed)) {
        const nameMatch = trimmed.match(/^([\u4e00-\u9fa5]{2,10})[：:]?\s*(.+)/);
        if (nameMatch) {
          const name = nameMatch[1];
          const desc = nameMatch[2];
          const valueMatch = desc.match(/(\d+\.?\d*)\s*([\u4e00-\u9fa5a-zA-Z/²%°μ]+)/);
          result.abnormalItems.push({
            name,
            value: valueMatch ? valueMatch[1] : desc.slice(0, 20),
            unit: valueMatch ? valueMatch[2] : '',
            ref: '',
            level: 'slight',
            plainText: desc.slice(0, 80),
            suggestion: 'yellow',
          });
        }
      }
    }
    if (result.summary) return result;
    return null;
  } catch {
    return null;
  }
}
