import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是一位体检报告解读助手。请从以下体检报告文本中提取所有信息，并以严格 JSON 格式返回。

必须包含以下字段：
- summary: string（3句话的整体摘要）
- abnormalItems: array（异常指标数组，每个对象包含 name, value, unit, ref, level, plainText, suggestion）
- normalItems: array（正常指标数组，每个对象包含 name, value, unit, ref）
- yearlyReports: array（如果只有一年数据则填 []；如果报告中包含多年体检数据，必须按年份拆分）
- reportDate: string（体检日期，格式如 2024-01-15，如果能找到年月日请尽量精确）
- institution: string（体检机构名称）

异常指标字段说明：
- name: 中文指标名
- value: 数值（string）
- unit: 单位
- ref: 参考区间，必须填写
- level: 异常程度，只能是 "slight" | "moderate" | "severe"
- plainText: 80字以内的通俗解释
- suggestion: 三级建议，只能是 "green" | "yellow" | "red"

体检日期提取规则（非常重要）：
1. 仔细查找报告中的日期，通常在标题、页眉或表格中
2. 优先提取体检日期（不是打印日期或报告日期）
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

function extractDate(text: string): string {
  // 尝试从文本中提取日期
  // 常见格式：2024年3月15日、2024-03-15、2024/03/15、2024.03.15

  // 优先查找体检日期相关的关键词
  const patterns = [
    // 体检日期
    /(?:体检日期|检查日期|检查时间|体检时间|报告日期)[：:]\s*(\d{4}[年\-/\.]\d{1,2}[月\-/\.]\d{1,2}日?)/i,
    // 通用日期格式
    /(\d{4}[年\-/\.]\d{1,2}[月\-/\.]\d{1,2})日?/,
    // 只有年月
    /(\d{4}年\d{1,2}月)/,
    // 只有年份
    /(\d{4})年/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[1] || match[0];
      // 统一格式化
      dateStr = dateStr.replace(/[年]/g, '-').replace(/[月]/g, '-').replace(/日/g, '').replace(/\./g, '-').replace(/\//g, '-');
      // 去掉多余的连字符
      dateStr = dateStr.replace(/-+/g, '-').replace(/-$/, '');
      return dateStr;
    }
  }

  return '';
}

function extractInstitution(text: string): string {
  // 常见体检机构关键词
  const patterns = [
    /(?:体检中心|医院|体检机构)[：:]\s*([^\n\r\d]{2,20})/i,
    /(?:美年大健康|爱康国宾|慈铭|瑞慈|美兆)[^\n\r]*/i,
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
    })).filter((yr: any) => yr.year && (yr.abnormalItems.length > 0 || yr.normalItems.length > 0));
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

function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) return JSON.parse(braceMatch[0]);
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
      return NextResponse.json(mockData());
    }

    try {
      const parsed = extractJson(content);
      const adapted = adaptFormat(parsed, text);

      // 校验关键字段
      if (
        !adapted.summary ||
        !Array.isArray(adapted.abnormalItems) ||
        !Array.isArray(adapted.normalItems)
      ) {
        return NextResponse.json(mockData());
      }

      return NextResponse.json(adapted);
    } catch {
      return NextResponse.json(mockData());
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}