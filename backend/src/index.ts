import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { runAgent } from './agent';
import { initDB, pool } from './db';

// In-memory fallback when DB is not available
const memoryStore = new Map<string, any>();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database on startup (non-fatal)
initDB().catch((err) => {
  console.warn('⚠️ 数据库未连接，使用内存模式（分析结果不会保存）');
  console.warn('   安装 PostgreSQL 后可启用完整功能');
});

// Search endpoint — triggers the Agent pipeline
app.post('/api/search', async (req, res) => {
  const { keyword, country } = req.body;
  if (!keyword || !country) {
    res.status(400).json({ error: '请提供 keyword 和 country' });
    return;
  }

  const searchId = uuidv4();

  try {
    const report = await runAgent(keyword, country, (step) => {
      console.log(`  [${step.name}] ${step.status}: ${step.detail}`);
    });

    // Save to database (or memory fallback)
    const record = { id: searchId, keyword, country, report_json: report, score: report.score, created_at: new Date().toISOString() };
    try {
      await pool.query(
        `INSERT INTO search_history (id, keyword, country, report_json, score)
         VALUES ($1, $2, $3, $4, $5)`,
        [searchId, keyword, country, JSON.stringify(report), report.score]
      );
    } catch {
      memoryStore.set(searchId, record);
    }

    res.json({ searchId, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '分析失败，请重试' });
  }
});

// History endpoint
app.get('/api/history', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, keyword, country, score, created_at
       FROM search_history
       ORDER BY created_at DESC
       LIMIT 50`
    );
    const dbItems = result.rows;
    const memItems = Array.from(memoryStore.values())
      .map(({ id, keyword, country, score, created_at }) => ({ id, keyword, country, score, created_at }));
    res.json([...dbItems, ...memItems].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 50));
  } catch {
    const memItems = Array.from(memoryStore.values())
      .map(({ id, keyword, country, score, created_at }) => ({ id, keyword, country, score, created_at }));
    res.json(memItems.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  }
});

// Get single report
app.get('/api/report/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM search_history WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
      return;
    }
  } catch {}

  // Memory fallback
  const memItem = memoryStore.get(req.params.id);
  if (memItem) {
    res.json(memItem);
    return;
  }

  res.status(404).json({ error: '报告不存在' });
});

app.listen(PORT, () => {
  console.log(`🚀 Seloo API running on http://localhost:${PORT}`);
});
