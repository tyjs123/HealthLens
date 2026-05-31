export function extractDate(text: string): string {
  // 尝试从文本中提取日期
  // 常见格式：2024年3月15日、2024-03-15、2024/03/15、2024.03.15、20240315

  const patterns = [
    // 体检日期 / 检查日期（最优先）
    /(?:体检日期|检查日期|检查时间|体检时间|报告日期)[\s：:]*(\d{4})[\-/\.年](\d{1,2})[\-/\.月](\d{1,2})日?/i,
    // 中文格式 2024年3月15日（无分隔符）
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/,
    // 标准 ISO 格式 2024-03-15 或 2024/03/15 或 2024.03.15
    /(\d{4})[\-/\.](\d{1,2})[\-/\.](\d{1,2})/,
    // 紧凑格式 20240315（无分隔符）
    /(\d{4})(\d{2})(\d{2})\b/,
    // 只有年月 2024年3月
    /(\d{4})\s*年\s*(\d{1,2})\s*月/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2] ? match[2].padStart(2, '0') : '';
      const day = match[3] ? match[3].padStart(2, '0') : '';

      if (day && month) {
        return `${year}-${month}-${day}`;
      } else if (month) {
        return `${year}-${month}`;
      } else {
        return year;
      }
    }
  }

  return '';
}
