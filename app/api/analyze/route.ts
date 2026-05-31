import { NextRequest, NextResponse } from 'next/server';
import { extractDate } from '@/lib/extract-date';

export const runtime = 'edge';

const SYSTEM_PROMPT = `你是一位体检报告解读助手。请从以下体检报告文本中提取所有信息，并以严格 JSON 格式返回。

必须包含以下字段：
- summary: string（3句话的整体摘要）
- abnormalItems: array（异常指标数组，每个对象包含 name, value, unit, ref, level, plainText, suggestion）
- normalItems: array（正常指标数组，每个对象包含 name, value, unit, ref）
- yearlyReports: array（如果只有一年数据则填 []；如果报告中包含多年体检数据，必须按年份拆分，见下方规则）
- reportDate: string（最近一年的体检日期，格式如 2024-01-15，如果能找到年月日请尽量精确）
- institution: string（体检机构名称）

异常指标字段说明：
- name: 中文指标名
- value: 数值（string）
- unit: 单位
- ref: 参考区间，必须填写
- level: 异常程度，只能是 "slight" | "moderate" | "severe"
- plainText: 80字以内的通俗解释。不要包含双引号("), 如果必须引用请用单引号(')。不要包含换行符，所有内容写在一行
- suggestion: 三级建议，只能是 "green" | "yellow" | "red"

多年报告拆分规则（非常重要）：
1. 如果 PDF 中包含多个年份的体检数据（如 2024、2025、2026），必须在 yearlyReports 中按年份严格拆分
2. 每个 yearlyReport 的 year 字段必须填写该年份（如 "2024"、"2025"、"2026"）
3. 每个 yearlyReport 的 abnormalItems 和 normalItems 必须只包含该年份对应的体检指标，严禁将某一年数据复制到其他年份
4. 识别年份的方法：查找表格标题、页眉、页面顶部或章节开头标注的年份信息
5. 主报告的 abnormalItems 和 normalItems 应该汇总所有年份的异常指标（去重合并），summary 应对所有年份做整体概述
6. 如果无法确定某个指标属于哪一年，优先放入最近一年的 yearlyReport 中
7. 每个 yearlyReport 必须独立完整，不能只放部分指标

体检日期提取规则（非常重要）：
1. 仔细查找报告中的日期，通常在标题、页眉或表格中
2. 优先提取最近一年的体检日期（不是打印日期、报告日期，也不是出生日期）
3. 日期格式统一为 YYYY-MM-DD，如 "2024-03-15"
4. 如果只找到年份，如 2024年，则填写 "2024"
5. 如果完全找不到日期，设为空字符串 ""

机构名称提取：
1. 查找报告中的体检机构名称，通常在标题或页眉
2. 常见关键词：体检中心、医院名称、检测机构
3. 如果找不到，设为空字符串 ""

BMI 计算：
1. 必须提取身高和体重，计算 BMI = 体重(kg) / (身高(m))²
2. 中国成人BMI标准：
   - BMI < 18.5：体重过轻（异常）
   - 18.5 ≤ BMI ≤ 23.9：正常
   - 24.0 ≤ BMI ≤ 27.9：超重
   - BMI ≥ 28.0：肥胖

表格/描述式体检报告适配规则（如教师资格体检表、入职体检表、事业单位体检表等）：
1. 这类报告通常按科室分类（五官科、外科、内科、化验检查等），数值嵌入在描述文字中
2. 必须从描述文字中精确提取以下指标：
   - 基础指标：身高、体重、裸眼视力（左右眼）、矫正视力（左右眼）、血压
   - 化验指标：白细胞、红细胞、血红蛋白、血小板、ALT/谷丙转氨酶、AST/谷草转氨酶、总胆红素、直接胆红素、肌酐、尿素氮、尿酸、空腹血糖
   - 其他：心率、尿蛋白、尿糖、尿潜血
3. 提取方法示例：
   - "身高：175 厘米" → name: "身高", value: "175", unit: "cm"
   - "血压：118/76 mmHg" → 拆分为两个指标：收缩压 118 mmHg、舒张压 76 mmHg
   - "白细胞 6.5×10⁹/L" → name: "白细胞计数", value: "6.5", unit: "10^9/L"
   - "尿酸 320 μmol/L" → name: "尿酸", value: "320", unit: "μmol/L"
4. 如果报告没有提供参考范围，使用以下通用医学参考范围：
   - 白细胞计数：4-10 (10^9/L)
   - 红细胞计数：男4.3-5.8/女3.8-5.1 (10^12/L)
   - 血红蛋白：男130-175/女115-150 (g/L)
   - 血小板：100-300 (10^9/L)
   - ALT/谷丙转氨酶：9-50 (U/L)
   - AST/谷草转氨酶：15-40 (U/L)
   - 总胆红素：3.4-20.5 (μmol/L)
   - 肌酐：男53-106/女44-97 (μmol/L)
   - 尿素氮：2.6-7.5 (mmol/L)
   - 尿酸：208-428 (μmol/L)
   - 空腹血糖：3.9-6.1 (mmol/L)
   - 收缩压：90-139 (mmHg)
   - 舒张压：60-89 (mmHg)
   - 心率：60-100 (次/分)
5. 医师意见中的关键描述要保留在 plainText 中（如"尿酸较往年轻度升高"、"裸眼视力较前略有下降"）
6. 体检结论为"合格"不代表所有指标完美，仍需根据具体数值判断异常项

JSON 格式要求（非常重要）：
1. 所有字符串值不要包含未转义的双引号("), 必须使用 \" 转义或改用单引号(')
2. 所有字符串值不要包含换行符(\n), 所有内容写在一行
3. 数组元素之间必须有逗号分隔，最后一个元素后面不要加逗号
4. 确保 JSON 完整闭合，不要截断

示例输出：
{
  "summary": "整体亚健康，发现2项异常。",
  "abnormalItems": [...],
  "normalItems": [...],
  "yearlyReports": [],
  "reportDate": "2024-03-15",
  "institution": "美年大健康"
}`;

function mockData() {
  return {
    summary: '整体亚健康，发现 4 项异常。最需要关注尿酸和血脂异常，建议调整饮食并定期复查。',
    abnormalItems: [
      {
        name: '尿酸',
        value: '450',
        unit: 'μmol/L',
        ref: '208-428',
        level: 'slight',
        plainText: '尿酸比正常值高 22，说明体内嘌呤代谢垃圾排得偏慢，长期堆积可能引发痛风。',
        suggestion: 'yellow',
      },
      {
        name: '甘油三酯',
        value: '2.8',
        unit: 'mmol/L',
        ref: '0.56-1.7',
        level: 'moderate',
        plainText: '甘油三酯明显偏高，说明血液中油脂含量过多，容易导致血管堵塞和胰腺炎风险。',
        suggestion: 'yellow',
      },
      {
        name: '低密度脂蛋白胆固醇',
        value: '3.6',
        unit: 'mmol/L',
        ref: '2.07-3.1',
        level: 'slight',
        plainText: '俗称"坏胆固醇"，偏高意味着血管壁更容易沉积斑块，长期会增加心脑血管疾病风险。',
        suggestion: 'green',
      },
      {
        name: 'BMI指数',
        value: '26.5',
        unit: 'kg/m²',
        ref: '18.5-23.9',
        level: 'slight',
        plainText: 'BMI处于超重范围，说明体重超过正常标准，建议控制饮食热量并增加有氧运动。',
        suggestion: 'yellow',
      },
    ],
    normalItems: [
      { name: '白细胞计数', value: '6.5', unit: '10^9/L', ref: '4-10' },
      { name: '红细胞计数', value: '4.8', unit: '10^12/L', ref: '4.3-5.8' },
      { name: '血红蛋白', value: '145', unit: 'g/L', ref: '130-175' },
      { name: '空腹血糖', value: '5.2', unit: 'mmol/L', ref: '3.9-6.1' },
      { name: '总胆固醇', value: '4.5', unit: 'mmol/L', ref: '3.1-5.7' },
      { name: '谷丙转氨酶', value: '28', unit: 'U/L', ref: '9-50' },
      { name: '谷草转氨酶', value: '24', unit: 'U/L', ref: '15-40' },
      { name: '身高', value: '175', unit: 'cm', ref: '-' },
      { name: '体重', value: '81.2', unit: 'kg', ref: '-' },
    ],
    yearlyReports: [],
    reportDate: '',
    institution: '',
  };
}

function extractInstitution(text: string): string {
  // 常见体检机构关键词
  const patterns = [
    /(?:体检中心|医院|体检机构)[：:]\s*([^\n\r\d]{2,20})/i,
    /(美年大健康|爱康国宾|慈铭|瑞慈|美兆)[^\n\r]*/i,
    /^([^\n\r]{5,30}体检[中心医院])/im,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

function adaptFormat(raw: any, text?: string) {
  const result: any = {
    summary: '',
    abnormalItems: [],
    normalItems: [],
    yearlyReports: [],
    reportDate: '',
    institution: '',
  };

  // summary
  if (typeof raw.summary === 'string') {
    result.summary = raw.summary;
  } else if (Array.isArray(raw.summary)) {
    result.summary = raw.summary.join('');
  }

  // abnormalItems
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

  // normalItems
  const normals = raw.normalItems || raw.normals || raw.normal || [];
  result.normalItems = normals.map((item: any) => ({
    name: String(item.name || ''),
    value: String(item.value ?? ''),
    unit: String(item.unit || ''),
    ref: String(item.ref || item.reference || ''),
  }));

  // yearlyReports
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

  // 从 AI 返回结果中提取日期
  if (raw.reportDate && typeof raw.reportDate === 'string') {
    result.reportDate = raw.reportDate;
  }

  // 从原始文本中提取日期
  if (!result.reportDate && text) {
    result.reportDate = extractDate(text);
  }

  // 从 AI 返回结果中提取机构
  if (raw.institution && typeof raw.institution === 'string') {
    result.institution = raw.institution;
  }

  // 从原始文本中提取机构
  if (!result.institution && text) {
    result.institution = extractInstitution(text);
  }

  return result;
}

function repairJson(text: string): string {
  // 使用状态机遍历文本，修复字符串中的非法字符
  let repaired = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (!inString) {
      // 不在字符串中：处理 JSON 结构
      if (char === '"') {
        inString = true;
        repaired += char;
      } else if (char === '\n' || char === '\r') {
        // JSON 结构中的换行符替换为空格
        repaired += ' ';
      } else {
        repaired += char;
      }
    } else {
      // 在字符串中
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
        // 字符串中的换行符，替换为空格（最常见导致解析失败的原因）
        repaired += ' ';
      } else {
        repaired += char;
      }
    }
  }

  // 去掉数组/对象末尾的 trailing comma
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // 如果 JSON 被截断，尝试补全闭合括号
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets);
  }

  return repaired;
}

function extractJson(text: string): any {
  const candidates: string[] = [];

  // 候选1：整个文本
  candidates.push(text);

  // 候选2：从代码块中提取
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) candidates.push(codeMatch[1].trim());

  // 候选3：从第一个 { 到最后一个 }（贪婪匹配，应对嵌套结构）
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  // 候选4：非贪婪匹配第一个 {...}
  const braceMatch = text.match(/\{[\s\S]*?\}/);
  if (braceMatch) candidates.push(braceMatch[0]);

  // 尝试所有候选，先原样解析，再修复后解析
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

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  text: string
) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `以下是体检报告文本：\n\n${text}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function callClaude(apiKey: string, text: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `以下是体检报告文本：\n\n${text}` }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '缺少文本内容' }, { status: 400 });
    }

    const apiKey =
      process.env.DEEPSEEK_API_KEY ||
      process.env.MOONSHOT_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      '';
    if (!apiKey) {
      return NextResponse.json(mockData());
    }

    let content: string | undefined;

    // 策略1：Claude
    if (apiKey.startsWith('sk-ant-')) {
      try {
        content = await callClaude(apiKey, text);
      } catch {
        /* ignore */
      }
    }

    // 策略2：OpenAI 兼容（DeepSeek / Moonshot / 代理）
    if (!content) {
      try {
        content = await callOpenAICompatible(
          'https://api.deepseek.com',
          apiKey,
          'deepseek-chat',
          text
        );
      } catch {
        /* ignore */
      }
    }
    if (!content) {
      try {
        content = await callOpenAICompatible(
          'https://api.moonshot.cn/v1',
          apiKey,
          'moonshot-v1-8k',
          text
        );
      } catch {
        /* ignore */
      }
    }
    if (!content) {
      const baseUrl = process.env.OPENAI_BASE_URL;
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      if (baseUrl) {
        try {
          content = await callOpenAICompatible(baseUrl, apiKey, model, text);
        } catch {
          /* ignore */
        }
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: 'AI 服务响应超时或不可用，请稍后重试。如报告页数较多，建议拆分后逐页上传。' },
        { status: 503 }
      );
    }

    try {
      const parsed = extractJson(content);
      const adapted = adaptFormat(parsed, text);

      // 校验关键字段，放宽条件：允许 summary 为空，只要有指标数据即可
      if (
        !Array.isArray(adapted.abnormalItems) ||
        !Array.isArray(adapted.normalItems)
      ) {
        return NextResponse.json(
          { error: 'AI 返回的数据格式不完整，请重试' },
          { status: 422 }
        );
      }

      return NextResponse.json(adapted);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'AI 返回格式异常，请重试。' + (e.message || '') },
        { status: 422 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}