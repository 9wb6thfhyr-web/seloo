import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/seloo',
});

export async function initDB() {
  const client = await pool.connect();
  try {
    // Enable pgvector extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id UUID PRIMARY KEY,
        keyword TEXT NOT NULL,
        country TEXT NOT NULL,
        report_json JSONB NOT NULL DEFAULT '{}',
        score INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        country TEXT NOT NULL,
        category TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536)
      )
    `);

    // Create index for vector search
    await client.query(`
      CREATE INDEX IF NOT EXISTS compliance_rules_embedding_idx
      ON compliance_rules
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
}

// Insert a compliance rule with embedding
export async function insertComplianceRule(
  country: string,
  category: string,
  ruleType: string,
  content: string,
  embedding: number[]
) {
  await pool.query(
    `INSERT INTO compliance_rules (country, category, rule_type, content, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [country, category, ruleType, content, `[${embedding.join(',')}]`]
  );
}

// Search similar compliance rules via vector
export async function searchComplianceRules(embedding: number[], limit = 5) {
  const result = await pool.query(
    `SELECT id, country, category, rule_type, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM compliance_rules
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [`[${embedding.join(',')}]`, limit]
  );
  return result.rows;
}
