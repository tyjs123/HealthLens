# HealthLens — 体检报告 AI 解读官

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

<p align="center">
  <b>3 分钟读懂你的体检报告</b> — 上传 PDF 体检报告，AI 自动提取指标、解读异常、生成健康建议。
</p>

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📄 **PDF 智能解析** | 提取文字版体检报告中的全部指标，自动分类正常 / 异常 |
| 🤖 **多模型 AI 解读** | 支持 DeepSeek、Moonshot(Kimi)、Claude 等多种大模型 |
| ⚡ **异常指标可视化** | 按严重程度分级（轻微 / 中度 / 严重），附带通俗科普解释 |
| 📊 **历年趋势对比** | 本地保存历史报告，生成核心指标变化趋势图 |
| 💾 **本地隐私优先** | 报告数据仅存储在浏览器本地，不上传云端 |
| 📱 **响应式设计** | 桌面端、移动端完美适配 |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/healthlens.git
cd healthlens
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 AI API Key（任选其一）：

```env
# 推荐：DeepSeek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# 或：Moonshot (Kimi)
MOONSHOT_API_KEY=sk-xxxxxxxxxxxxxxxx

# 或：Claude
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

> 💡 **没有 API Key？** 不配置也可以运行，系统会自动使用内置的示例数据进行演示。

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 5. 构建生产版本

```bash
npm run build
```

## 🏗️ 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **图表**: [Recharts](https://recharts.org/)
- **PDF 解析**: [pdfjs-dist](https://github.com/mozilla/pdf.js)
- **AI 接口**: OpenAI 兼容 API / Claude API

## 📁 项目结构

```
healthlens/
├── app/                    # Next.js App Router
│   ├── api/analyze/        # AI 分析 API 路由
│   ├── history/            # 历史记录页面
│   ├── report/             # 报告解读结果页
│   ├── page.tsx            # 首页（上传页）
│   └── layout.tsx          # 根布局
├── components/             # React 组件
│   ├── upload-zone.tsx     # 文件上传拖拽区
│   ├── abnormal-card.tsx   # 异常指标卡片
│   ├── normal-list.tsx     # 正常指标列表
│   ├── summary-header.tsx  # 报告摘要头部
│   └── trend-chart.tsx     # 历年趋势图表
├── context/                # React Context（报告状态管理）
├── lib/                    # 工具库
│   ├── pdf-parser.ts       # PDF 文本提取
│   ├── deepseek.ts         # AI 分析客户端
│   ├── storage.ts          # 本地存储（localStorage）
│   └── utils.ts            # 通用工具函数
├── data/                   # 静态数据
│   ├── sample-report.ts    # 示例报告数据
│   └── hospitals.json      # 医院/机构数据
├── types/                  # TypeScript 类型定义
├── public/                 # 静态资源
└── package.json
```

## 🔒 隐私说明

- 体检报告数据**仅保存在浏览器本地**（localStorage），不会上传到任何服务器。
- AI 分析时，仅将报告的**文本内容**发送至你配置的 AI 服务商（DeepSeek / Moonshot / Claude 等）。
- 不上传原始 PDF 文件到云端，PDF 解析完全在浏览器本地完成。

## ⚠️ 免责声明

本工具仅提供体检报告信息整理与健康科普，**不构成医疗诊断或治疗建议**。如有身体不适或健康疑虑，请及时就医并咨询专业医生。

## 📝 适配报告类型

当前已适配以下机构的体检报告版式：

- 美年大健康
- 爱康国宾
- 公立医院标准版式

> 大部分文字版 PDF 体检报告均可正常解析。如果是扫描件或图片版 PDF，可能无法识别，建议联系体检机构获取文字版报告。

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

---

<p align="center">
  Made with ❤️ for better health awareness.
</p>
