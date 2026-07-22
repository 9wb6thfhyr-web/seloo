# Seloo — 拉美电商 AI 选品知识库

输入一个品类名，AI Agent 自动完成「数据抓取 → 合规检索 → 竞品分析 → 报告生成」，输出可做指数。

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Tailwind CSS + React Router |
| 后端 | Node.js + Express + TypeScript |
| AI | DeepSeek API（Agent 决策链 + RAG 向量检索） |
| 数据库 | PostgreSQL + Pgvector（合规法规知识库） |

## AI Agent 架构

5 步决策链：
1. **意图拆解** — LLM 将自然语言转为结构化任务
2. **数据抓取** — 获取 Mercado/Shopee/TikTok Shop 市场数据
3. **合规检索 (RAG)** — 向量检索法规数据库，命中认证要求
4. **竞品分析** — LLM 对比价格带/评分，计算建议售价
5. **报告生成** — 汇总输出可做指数 + 风险提示

## 快速开始

```bash
# 1. 后端
cd backend
cp .env .env.local   # 填入 DEEPSEEK_API_KEY
npm install
npm run seed         # 导入法规知识库
npm run dev          # http://localhost:3001

# 2. 前端
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## 部署

- 前端 → Vercel（免费）
- 后端 → Railway（免费额度）
- 数据库 → Supabase（免费 500MB，内置 Pgvector）

---

Built by 张文泽 · 2026 AI先锋未来人才大赛 · Seloo
