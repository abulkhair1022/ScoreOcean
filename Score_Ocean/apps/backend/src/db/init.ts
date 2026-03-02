import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './postgres';

export async function initializeDatabase() {
  try {
    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSQL);

    // Incremental migrations
    await pool.query(`ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT NULL`);
    await pool.query(`ALTER TABLE auction_players ADD COLUMN IF NOT EXISTS base_price_override NUMERIC DEFAULT NULL`);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}
