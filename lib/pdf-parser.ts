'use client';

/**
 * 清理 PDF 提取的文本：
 * 1. 去掉中文字符之间的多余空格（PDF 排版导致每个字独立）
 * 2. 合并连续空格和换行
 */
function cleanPdfText(text: string): string {
  const cleaned = text
    // 去掉中文字符之间的空格
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
    // 去掉中文标点和中文之间的空格
    .replace(/([\u4e00-\u9fa5])\s+([\u3000-\u303f\uff00-\uffef])/g, '$1$2')
    .replace(/([\u3000-\u303f\uff00-\uffef])\s+([\u4e00-\u9fa5])/g, '$1$2')
    // 合并连续空格为单个
    .replace(/[^\S\n]+/g, ' ')
    // 去掉行首行尾空格
    .replace(/^\s+|\s+$/gm, '')
    // 超过2个换行合并为2个
    .replace(/\n\s*\n\s*\n+/g, '\n\n');
  return cleaned.trim();
}

/**
 * 过滤掉体检报告中的无关内容（体检须知、填表说明、封面标题等）
 * 减少发送给 AI 的文本量，避免超时
 */
function filterMedicalText(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inNoticeSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 跳过封面上的机构名称（通常很短且重复）
    if (/^(广东省|中共广东省|教育厅|财政厅|人力资源和社会保障厅|卫生厅|体检编号|体检表|聘用体检表)$/.test(trimmed)) {
      continue;
    }

    // 检测到"体检须知"等无关章节的开始
    if (/体检须知|体检注意事项|填表说明|填表须知/.test(trimmed)) {
      inNoticeSection = true;
      continue;
    }

    // 如果当前在"体检须知"段落中，检测是否遇到下一个主要章节
    if (inNoticeSection) {
      // 体检须知通常以数字序号开头，如果遇到非序号行且包含医学相关章节标题，说明须知结束
      if (!/^\d+[\.、]/.test(trimmed) && /^(姓名|性别|年龄|一般检查|内科|外科|眼科|耳鼻喉科|口腔科|妇科检查|化验检查|心电图|B超|胸部透视|体检结论|主检医生|检查医师)/.test(trimmed)) {
        inNoticeSection = false;
      } else {
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * 如果文本仍然太长，智能截断到合理长度
 * 保留前 1500 字符（个人信息）和后 6500 字符（检查结果）
 */
function truncateIfNeeded(text: string, maxLength = 8000): string {
  if (text.length <= maxLength) return text;

  const headLength = 1500;
  const tailLength = maxLength - headLength;
  const head = text.slice(0, headLength);
  const tail = text.slice(-tailLength);

  // 尝试在 tail 的开头找到一个完整的行开始
  const firstNewline = tail.indexOf('\n');
  const cleanTail = firstNewline > 0 ? tail.slice(firstNewline + 1) : tail;

  return head + '\n\n...（中间内容已省略，保留检查结果）...\n\n' + cleanTail;
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
  cleaned = truncateIfNeeded(cleaned);
  return cleaned;
}
