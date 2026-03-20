const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // Connect to postgres database to create score_ocean
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'score_ocean'"
    );

    if (result.rows.length === 0) {
      console.log('Creating score_ocean database...');
      await client.query('CREATE DATABASE score_ocean');
      console.log('✓ Database created successfully');
    } else {
      console.log('✓ Database already exists');
    }

    await client.end();
    console.log('\nNow run: npm run db:init');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
