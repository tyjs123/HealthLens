interface DateMatch {
  date: string;
  index: number;
  length: number;
  score: number;
  raw: string;
}

function formatDate(year: string, month: string, day: string): string {
  const m = month ? month.padStart(2, '0') : '';
  const d = day ? day.padStart(2, '0') : '';
  if (d && m) return `${year}-${m}-${d}`;
  if (m) return `${year}-${m}`;
  return year;
}

function getContext(text: string, index: number, length: number, radius = 100): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  return text.slice(start, end);
}

function overlaps(matches: DateMatch[], start: number, end: number): boolean {
  return matches.some((x) => x.index < end && x.index + x.raw.length > start);
}

function scoreDate(context: string): number {
  const ctx = context.toLowerCase();

  // 直接排除：出生日期相关
  const birthKeywords =
    /出生|生日|生辰|诞生|出生日期|出生年月|出生时间|诞辰/;
  if (birthKeywords.test(ctx)) return -Infinity;

  // 直接排除：个人信息区域（这些字段附近出现的日期通常是出生日期）
  const personalKeywords =
    /年龄|民族|籍贯|职业|性别|住址|身份证号|婚姻状况|学历|电话|手机|邮箱|联系人|关系|户口|户籍|家庭地址|工作单位|职务|职称|家庭史|既往史/;
  if (personalKeywords.test(ctx)) return -Infinity;

  let score = 0;

  // 明确的体检日期标记（最高优先级）
  const examMarkers =
    /体检日期|检查日期|体检时间|检查时间|报告日期|报告时间|检验日期|检验时间|采样日期|采样时间|申请日期|登记日期/;
  if (examMarkers.test(ctx)) score += 100;

  // 次要的体检/医疗相关
  const examRelated = /体检|检查|报告|检验|化验|诊断|送检|复诊|复查/;
  if (examRelated.test(ctx)) score += 20;

  // 表单/手续相关
  const formMarkers = /填表日期|预约日期|送检日期|接诊日期|入院日期|出院日期/;
  if (formMarkers.test(ctx)) score += 15;

  return score;
}

export function extractDate(text: string): string {
  const matches: DateMatch[] = [];
  let m: RegExpExecArray | null;

  // 模式1: 带明确标签的日期（如"体检日期：2024-03-15"）
  const pattern1 =
    /(?:体检日期|检查日期|体检时间|检查时间|报告日期|报告时间|检验日期|检验时间|采样日期|采样时间)[\s：:]*(\d{4})[\-/\.年](\d{1,2})[\-/\.月](\d{1,2})日?/gi;
  while ((m = pattern1.exec(text)) !== null) {
    const ctx = getContext(text, m.index, m[0].length);
    const score = scoreDate(ctx);
    if (score > -Infinity) {
      matches.push({
        date: formatDate(m[1], m[2], m[3]),
        index: m.index,
        length: m[0].length,
        score,
        raw: m[0],
      });
    }
  }

  // 模式2: 纯中文日期（如"2024年3月15日"）
  const pattern2 = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g;
  while ((m = pattern2.exec(text)) !== null) {
    if (overlaps(matches, m.index, m.index + m[0].length)) continue;
    const ctx = getContext(text, m.index, m[0].length);
    const score = scoreDate(ctx);
    if (score > -Infinity) {
      matches.push({
        date: formatDate(m[1], m[2], m[3]),
        index: m.index,
        length: m[0].length,
        score,
        raw: m[0],
      });
    }
  }

  // 模式3: ISO / 斜杠 / 点分隔（如"2024-03-15"、"2024/03/15"、"2024.03.15"）
  const pattern3 = /(\d{4})[\-/\.](\d{1,2})[\-/\.](\d{1,2})/g;
  while ((m = pattern3.exec(text)) !== null) {
    if (overlaps(matches, m.index, m.index + m[0].length)) continue;
    const ctx = getContext(text, m.index, m[0].length);
    const score = scoreDate(ctx);
    if (score > -Infinity) {
      matches.push({
        date: formatDate(m[1], m[2], m[3]),
        index: m.index,
        length: m[0].length,
        score,
        raw: m[0],
      });
    }
  }

  // 模式4: 紧凑格式（如"20240315"）
  const pattern4 = /(\d{4})(\d{2})(\d{2})\b/g;
  while ((m = pattern4.exec(text)) !== null) {
    if (overlaps(matches, m.index, m.index + m[0].length)) continue;
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const ctx = getContext(text, m.index, m[0].length);
    const score = scoreDate(ctx);
    if (score > -Infinity) {
      matches.push({
        date: formatDate(m[1], m[2], m[3]),
        index: m.index,
        length: m[0].length,
        score,
        raw: m[0],
      });
    }
  }

  // 模式5: 只有年月（如"2024年3月"）
  const pattern5 = /(\d{4})\s*年\s*(\d{1,2})\s*月/g;
  while ((m = pattern5.exec(text)) !== null) {
    if (overlaps(matches, m.index, m.index + m[0].length)) continue;
    const ctx = getContext(text, m.index, m[0].length);
    const score = scoreDate(ctx);
    if (score > -Infinity) {
      matches.push({
        date: formatDate(m[1], m[2], ''),
        index: m.index,
        length: m[0].length,
        score,
        raw: m[0],
      });
    }
  }

  // 按分数降序，分数相同则位置靠前的优先
  matches.sort((a, b) => b.score - a.score || a.index - b.index);

  return matches.length > 0 ? matches[0].date : '';
}
