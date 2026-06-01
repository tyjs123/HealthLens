'use client';

/**
 * 清理 PDF 提取的文本：
 * 1. 强制合并中文字符之间的所有空白（PDF 排版导致每个字独立）
 * 2. 合并连续空格和换行
 * 3. 修复常见医学词汇的空格问题
 */
function cleanPdfText(text: string): string {
  const cleaned = text
    // 把行内空白字符（不含换行）统一成普通空格
    .replace(/[ \t\u00A0\u2000-\u200B\u3000]+/g, ' ')
    // 强制合并中文字符之间的空格（包括中文+标点）
    .replace(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\s+([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '$1$2')
    // 重复执行一次，处理连续三个中文字符中间有空格的情况（如"体 重 计"）
    .replace(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\s+([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '$1$2')
    // 合并英文单词之间的多余空格
    .replace(/([^\u4e00-\u9fa5])\s{2,}([^\u4e00-\u9fa5])/g, '$1 $2')
    // 去掉行首行尾空格
    .replace(/^\s+|\s+$/gm, '')
    // 超过2个换行合并为2个
    .replace(/\n\s*\n\s*\n+/g, '\n\n');

  return cleaned.trim();
}

/**
 * 过滤无关内容（体检须知、封面重复标题等）
 * 保留所有医学相关数据行
 */
function filterMedicalText(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inNoticeSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 跳过纯机构名称封面行（很短且无数据）
    if (/^(广东省|中共广东省|教育厅|财政厅|人力资源和社会保障厅|卫生厅)$/.test(trimmed)) {
      continue;
    }

    // 检测到"体检须知"等无关章节的开始（pdfjs-dist 可能把标题和正文挤在同一行，不用 ^ 锚点）
    if (/(体检须知|体检注意事项|填表说明|填表须知)\s*[：:]?/.test(trimmed) && !/姓名|性别|身高|血压|内科|外科/.test(trimmed)) {
      inNoticeSection = true;
      continue;
    }

    // 如果当前在"体检须知"段落中，检测是否遇到下一个主要章节
    if (inNoticeSection) {
      // 如果遇到明显的医学章节标题，结束须知过滤
      if (/^(姓名|性别|年龄|身高|体重|血压|内科|外科|眼科|耳鼻喉科|口腔科|妇科|化验检查|血常规|尿常规|血生化|免疫|心电图|B超|胸部透视|胸片|腹部超声|体检结论|主检医师|检查医师|医师签字)/.test(trimmed)) {
        inNoticeSection = false;
      } else if (/^\d+[\.、]/.test(trimmed) && trimmed.length < 80) {
        // 短数字序号（体检须知条目）继续跳过
        continue;
      } else {
        // 长文本且包含医学数据，可能是正文，保留
        if (/\d/.test(trimmed) && /[\u4e00-\u9fa5]{4,}/.test(trimmed)) {
          inNoticeSection = false;
        } else {
          continue;
        }
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * 按检查类别结构化重组文本
 * 参考 Kimi 2.6 的做法：把混乱的原始文本按科室/类别分组，让 AI 更容易提取
 */
function structureByCategory(text: string): string {
  const lines = text.split('\n');

  // 定义类别识别规则（按优先级排序）
  const categories: { name: string; patterns: RegExp[] }[] = [
    {
      name: '【基本信息】',
      patterns: [/^(姓名|性别|年龄|出生|民族|婚姻|籍贯|文化|联系|工作|职业|报考|身份|体检日期|体检编号)/],
    },
    {
      name: '【一般检查】',
      patterns: [/^(一般检查|身高|体重|BMI|体质指数|血压|收缩压|舒张压|腰围|腹型|心率|脉搏)/],
    },
    {
      name: '【内科】',
      patterns: [/^(内科|心界|心脏|心律|心率|心音|杂音|肺[：:]|呼吸音|腹部[：:]|腹型|肝[：:触]|脾[：:触]|神经系统|病理反射|生理反射|意识)/],
    },
    {
      name: '【外科】',
      patterns: [/^(外科|甲状腺|乳腺|浅表淋巴结|皮肤|脊柱|头颅|四肢关节|下肢|肛门|疝气|手术史|外伤史)/],
    },
    {
      name: '【眼科】',
      patterns: [/^(眼科|视力|裸眼|矫正|色觉|眼底|眼压|结膜|角膜|晶体|瞳孔)/],
    },
    {
      name: '【耳鼻喉科】',
      patterns: [/^(耳鼻喉科|耳[：:]|鼻[：:]|咽[：:]|喉[：:]|听力|嗅觉|扁桃体|声带|外耳道|鼓膜)/],
    },
    {
      name: '【口腔科】',
      patterns: [/^(口腔科|牙齿|龋齿|牙龈|牙结石|口腔黏膜|舌|腭|缺齿)/],
    },
    {
      name: '【妇科检查】',
      patterns: [/^(妇科|外阴|阴道|宫颈|子宫|附件|妊娠)/],
    },
    {
      name: '【辅助检查】',
      patterns: [/^(心电图|胸片|胸部透视|B超|超声|腹部B超|肝胆|甲状腺超声|X光|CT|MRI)/],
    },
    {
      name: '【血常规】',
      patterns: [/^(血常规|白细胞|WBC|红细胞|RBC|血红蛋白|HGB|血小板|PLT|中性粒|淋巴细胞|单核细胞|嗜酸|嗜碱)/],
    },
    {
      name: '【尿常规】',
      patterns: [/^(尿常规|尿糖|尿蛋白|蛋白质|胆红素|尿胆原|比重|尿酸碱|尿潜血|红细胞|白细胞|镜检|管型|结晶)/],
    },
    {
      name: '【血生化】',
      patterns: [/^(血生化|生化|ALT|AST|谷丙|谷草|总胆红素|直接胆红素|葡萄糖|血糖|尿素氮|肌酐|尿酸|甘油三酯|TG|总胆固醇|TC|高密度脂蛋白|HDL|低密度脂蛋白|LDL)/],
    },
    {
      name: '【免疫检查】',
      patterns: [/^(免疫|乙肝|抗HIV|HIV|梅毒|TPHA|TPPA|丙肝|甲肝|两对半|表面抗原|表面抗体)/],
    },
    {
      name: '【体检结论】',
      patterns: [/^(体检结论|主检|主检医师|检查结论|诊断意见|医生建议|健康建议|综合评估|合格|不合格|建议复查)/],
    },
  ];

  const groups: Record<string, string[]> = {};
  let currentCategory = '【其他】';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检测是否是新的类别标题行
    for (const cat of categories) {
      if (cat.patterns.some((p) => p.test(trimmed))) {
        currentCategory = cat.name;
        break;
      }
    }

    if (!groups[currentCategory]) groups[currentCategory] = [];
    groups[currentCategory].push(trimmed);
  }

  // 按固定顺序重组输出
  const orderedOutput: string[] = [];
  const categoryOrder = [
    '【基本信息】',
    '【一般检查】',
    '【内科】',
    '【外科】',
    '【眼科】',
    '【耳鼻喉科】',
    '【口腔科】',
    '【妇科检查】',
    '【辅助检查】',
    '【血常规】',
    '【尿常规】',
    '【血生化】',
    '【免疫检查】',
    '【体检结论】',
    '【其他】',
  ];

  for (const catName of categoryOrder) {
    if (groups[catName] && groups[catName].length > 0) {
      orderedOutput.push(catName);
      orderedOutput.push(...groups[catName]);
      orderedOutput.push(''); // 空行分隔
    }
  }

  return orderedOutput.join('\n');
}

/**
 * 如果文本仍然超长，优先截断中间无关内容，保留首尾
 */
function truncateIfNeeded(text: string, maxLength = 24000): string {
  if (text.length <= maxLength) return text;

  const headLength = 3000;
  const tailLength = maxLength - headLength;
  const head = text.slice(0, headLength);
  const tail = text.slice(-tailLength);

  // 尝试在 tail 的开头找到一个完整的行开始
  const firstNewline = tail.indexOf('\n');
  const cleanTail = firstNewline > 0 ? tail.slice(firstNewline + 1) : tail;

  return head + '\n\n...（中间部分检查结果已省略）...\n\n' + cleanTail;
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item as any).str)
        .join(' ');
      fullText += pageText + '\n';
    }
  } finally {
    pdf.destroy();
  }

  let cleaned = cleanPdfText(fullText);
  cleaned = filterMedicalText(cleaned);
  cleaned = structureByCategory(cleaned);
  cleaned = truncateIfNeeded(cleaned);
  return cleaned;
}
