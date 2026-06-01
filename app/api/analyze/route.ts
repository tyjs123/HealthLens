import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { adaptFormat, extractJson, tryExtractFromRawText } from '@/lib/analyze-utils';

export const runtime = 'edge';

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


async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  text: string,
  useJsonMode = true
) {
  const body: any = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `以下是体检报告文本：\n\n${text}` },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  };
  if (useJsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s 超时

  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[HealthLens] ${model} API error: HTTP ${res.status}`, errBody.slice(0, 500));
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await res.json();
    if (data.error) {
      console.error(`[HealthLens] ${model} API error:`, data.error);
      throw new Error(data.error.message || String(data.error));
    }
    return data.choices?.[0]?.message?.content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('请求超时（25秒）');
    }
    throw err;
  }
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
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `以下是体检报告文本：\n\n${text}` }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text;
}

function sanitizeTextForApi(text: string): string {
  // 移除可能导致 JSON/API 问题的控制字符（保留换行制表空格）
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 移除零宽字符
    .replace(/[\u200B-\u200F\uFEFF]/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '缺少文本内容' }, { status: 400 });
    }

    const cleanText = sanitizeTextForApi(text);

    // 按环境变量智能路由，避免逐个尝试浪费时间（Edge Runtime 30s 限制很紧）
    const dsKey = process.env.DEEPSEEK_API_KEY;
    const msKey = process.env.MOONSHOT_API_KEY;
    const antKey = process.env.ANTHROPIC_API_KEY;
    const customBase = process.env.OPENAI_BASE_URL;
    const customModel = process.env.OPENAI_MODEL;

    if (!dsKey && !msKey && !antKey && !customBase) {
      return NextResponse.json(mockData());
    }

    let content: string | undefined;
    const errors: string[] = [];

    // 优先直接用对应 key，避免串行 fallback 浪费时间
    if (antKey) {
      try {
        content = await callClaude(antKey, cleanText);
      } catch (err: any) {
        errors.push(`Claude: ${err.message || '失败'}`);
      }
    }

    if (!content && dsKey) {
      try {
        content = await callOpenAICompatible(
          'https://api.deepseek.com',
          dsKey,
          'deepseek-chat',
          cleanText
        );
      } catch (err: any) {
        errors.push(`DeepSeek: ${err.message || '失败'}`);
      }
    }

    if (!content && msKey) {
      try {
        content = await callOpenAICompatible(
          'https://api.moonshot.cn/v1',
          msKey,
          'moonshot-v1-32k',
          cleanText
        );
      } catch (err: any) {
        errors.push(`Moonshot: ${err.message || '失败'}`);
        // Moonshot JSON 模式失败时 fallback 到普通模式
        try {
          content = await callOpenAICompatible(
            'https://api.moonshot.cn/v1',
            msKey,
            'moonshot-v1-32k',
            cleanText,
            false
          );
        } catch (err2: any) {
          errors.push(`Moonshot(无JSON模式): ${err2.message || '失败'}`);
        }
      }
    }

    if (!content && customBase) {
      try {
        content = await callOpenAICompatible(
          customBase,
          dsKey || msKey || antKey || '',
          customModel || 'gpt-3.5-turbo',
          cleanText
        );
      } catch (err: any) {
        errors.push(`Custom: ${err.message || '失败'}`);
      }
    }

    if (!content) {
      return NextResponse.json(
        {
          error: `AI 分析失败。${errors.join('；')}`,
          errorDetails: errors,
        },
        { status: 503 }
      );
    }

    // 记录 AI 原始返回的前 1000 字符，方便排查
    console.log('[HealthLens] AI raw content length:', content.length);
    console.log('[HealthLens] AI raw content preview:', content.slice(0, 1000));

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
      // JSON 解析完全失败，尝试从 AI 返回的文本中直接提取关键信息作为后备
      const fallback = tryExtractFromRawText(content, text);
      if (fallback) {
        console.log('[HealthLens] JSON 解析失败，已使用后备提取策略');
        return NextResponse.json(fallback);
      }

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