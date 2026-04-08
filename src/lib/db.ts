import pg from 'pg';

const { Pool } = pg;

// 数据库连接池配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function exec_sql(sql: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    return result;
  } finally {
    client.release();
  }
}

export default pool;
