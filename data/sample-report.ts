import type { ReportData } from '@/types';

export const sampleReport: ReportData = {
  summary:
    '整体亚健康，发现 3 项异常。最需要关注尿酸和血脂异常，建议调整饮食并定期复查。',
  abnormalItems: [
    {
      name: '尿酸',
      value: '450',
      unit: 'μmol/L',
      ref: '208-428',
      level: 'slight',
      plainText:
        '尿酸比正常值高 22，说明体内嘌呤代谢垃圾排得偏慢，长期堆积可能引发痛风。',
      suggestion: 'yellow',
    },
    {
      name: '甘油三酯',
      value: '2.8',
      unit: 'mmol/L',
      ref: '0.56-1.7',
      level: 'moderate',
      plainText:
        '甘油三酯明显偏高，说明血液中油脂含量过多，容易导致血管堵塞和胰腺炎风险。',
      suggestion: 'yellow',
    },
    {
      name: '低密度脂蛋白胆固醇',
      value: '3.6',
      unit: 'mmol/L',
      ref: '2.07-3.1',
      level: 'slight',
      plainText:
        '俗称"坏胆固醇"，偏高意味着血管壁更容易沉积斑块，长期会增加心脑血管疾病风险。',
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
