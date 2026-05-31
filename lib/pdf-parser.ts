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

  return cleanPdfText(fullText);
}
