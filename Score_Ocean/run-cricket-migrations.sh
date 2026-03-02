#!/bin/bash

# Script to run cricket data persistence migrations
# Usage: ./run-cricket-migrations.sh

echo "=================================="
echo "Cricket Data Persistence Migrations"
echo "=================================="
echo ""

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found"
    echo "Please install PostgreSQL first"
    exit 1
fi

# Load environment variables
if [ -f apps/backend/.env ]; then
    export $(cat apps/backend/.env | grep -v '^#' | xargs)
    echo "✓ Loaded environment variables from apps/backend/.env"
else
    echo "⚠ Warning: apps/backend/.env not found"
    echo "Using default connection settings"
fi

# Set database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-score_ocean}
DB_USER=${DB_USER:-postgres}

echo ""
echo "Database Connection:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Run migrations
echo "Running migrations..."
echo ""

echo "1. Creating cricket match details tables..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f apps/backend/src/db/migrations/add_cricket_match_details.sql

if [ $? -eq 0 ]; then
    echo "✓ Cricket match details tables created"
else
    echo "❌ Failed to create cricket match details tables"
    exit 1
fi

echo ""
echo "2. Adding innings column to cricket stats..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f apps/backend/src/db/migrations/add_innings_to_cricket_stats.sql

if [ $? -eq 0 ]; then
    echo "✓ Innings column added to cricket stats"
else
    echo "❌ Failed to add innings column"
    exit 1
fi

echo ""
echo "3. Adding player IDs to cricket stats..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f apps/backend/src/db/migrations/add_player_ids_to_cricket_stats.sql

if [ $? -eq 0 ]; then
    echo "✓ Player IDs added to cricket stats"
else
    echo "❌ Failed to add player IDs"
    exit 1
fi

echo ""
echo "=================================="
echo "✓ All migrations completed successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Start the backend: cd apps/backend && npm run dev"
echo "2. Start the frontend: cd apps/frontend && npm run dev"
echo "3. Test cricket scoring with data persistence"
echo ""
