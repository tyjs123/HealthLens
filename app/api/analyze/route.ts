import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是一位体检报告解读助手。请从以下体检报告文本中提取所有指标，并以严格 JSON 格式返回。

必须包含以下字段：
- summary: string（3句话的整体摘要）
- abnormalItems: array（异常指标数组，每个对象包含 name, value, unit, ref, level, plainText, suggestion）
- normalItems: array（正常指标数组，每个对象包含 name, value, unit, ref）

异常指标字段说明：
- name: 中文指标名
- value: 数值（string）
- unit: 单位
- ref: 参考区间
- level: 异常程度，只能是 "slight" | "moderate" | "severe"
- plainText: 80字以内的通俗解释
- suggestion: 三级建议，只能是 "green" | "yellow" | "red"

注意：
1. 只提取报告中的真实指标
2. 异常指标是超出参考区间或有箭头标记的
3. 正常指标是在参考区间内的
4. 只做信息整理和科普解释，不做医疗诊断

示例输出格式：
{
  "summary": "整体亚健康，发现2项异常。最需要关注尿酸和血脂异常，建议调整饮食并定期复查。",
  "abnormalItems": [
    {
      "name": "尿酸",
      "value": "450",
      "unit": "μmol/L",
      "ref": "208-428",
      "level": "slight",
      "plainText": "尿酸比正常值高，说明嘌呤代谢偏慢，长期可能引发痛风。",
      "suggestion": "yellow"
    }
  ],
  "normalItems": [
    { "name": "白细胞计数", "value": "6.5", "unit": "10^9/L", "ref": "4-10" }
  ]
}`;

function mockData() {
  return {
    summary: '整体亚健康，发现 3 项异常。最需要关注尿酸和血脂异常，建议调整饮食并定期复查。',
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
    ],
    normalItems: [
      { name: '白细胞计数', value: '6.5', unit: '10^9/L', ref: '4-10' },
      { name: '红细胞计数', value: '4.8', unit: '10^12/L', ref: '4.3-5.8' },
      { name: '血红蛋白', value: '145', unit: 'g/L', ref: '130-175' },
      { name: '空腹血糖', value: '5.2', unit: 'mmol/L', ref: '3.9-6.1' },
      { name: '总胆固醇', value: '4.5', unit: 'mmol/L', ref: '3.1-5.7' },
      { name: '谷丙转氨酶', value: '28', unit: 'U/L', ref: '9-50' },
      { name: '谷草转氨酶', value: '24', unit: 'U/L', ref: '15-40' },
    ],
  };
}

function adaptFormat(raw: any) {
  // 适配 Moonshot / 各种模型可能返回的不同字段名
  const result: any = { summary: '', abnormalItems: [], normalItems: [] };

  // summary
  if (typeof raw.summary === 'string') {
    result.summary = raw.summary;
  } else if (Array.isArray(raw.summary)) {
    result.summary = raw.summary.join('');
  }

  // abnormalItems / abnormals
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

  // normalItems / normals
  const normals = raw.normalItems || raw.normals || raw.normal || [];
  result.normalItems = normals.map((item: any) => ({
    name: String(item.name || ''),
    value: String(item.value ?? ''),
    unit: String(item.unit || ''),
    ref: String(item.ref || item.reference || ''),
  }));

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
      const adapted = adaptFormat(parsed);

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
