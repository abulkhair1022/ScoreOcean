import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.maxConnections,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

pool.on('connect', () => {
  console.log('✓ PostgreSQL client connected');
});

export const query = async (text: string, params?: any[]) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.nodeEnv === 'development') {
      console.log('[DB Query]', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: res.rowCount,
      });
    }
    
    return res;
  } catch (error: any) {
    console.error('[DB Error]', {
      message: error.message,
      query: text.substring(0, 100),
    });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

export default pool;
