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
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS competition_type VARCHAR(50) NOT NULL DEFAULT 'TOURNAMENT'`);
    await pool.query(`ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id) ON DELETE CASCADE`);
    await pool.query(`ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS player_details JSONB DEFAULT '{}'`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_sport_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        sport VARCHAR(50) NOT NULL,
        statistics JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, sport)
      )
    `);

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
