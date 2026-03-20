#!/bin/bash

echo "==================================="
echo "Score Ocean - Service Setup"
echo "==================================="

# Check PostgreSQL
echo ""
echo "Checking PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL is running"
else
    echo "✗ PostgreSQL is not running"
    echo "  Starting PostgreSQL..."
    sudo systemctl start postgresql
    if [ $? -eq 0 ]; then
        echo "✓ PostgreSQL started successfully"
    else
        echo "✗ Failed to start PostgreSQL"
        echo "  Install with: sudo apt install postgresql postgresql-contrib"
    fi
fi

# Check Redis
echo ""
echo "Checking Redis..."
if systemctl is-active --quiet redis || systemctl is-active --quiet redis-server; then
    echo "✓ Redis is running"
else
    echo "✗ Redis is not running"
    echo "  Starting Redis..."
    sudo systemctl start redis-server 2>/dev/null || sudo systemctl start redis 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Redis started successfully"
    else
        echo "✗ Failed to start Redis"
        echo "  Install with: sudo apt install redis-server"
    fi
fi

# Setup PostgreSQL database
echo ""
echo "Setting up PostgreSQL database..."
echo "Enter PostgreSQL password for user 'postgres' (default: postgres):"
read -s DB_PASSWORD
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Set password
echo "Setting PostgreSQL password..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';" 2>/dev/null

# Create database
echo "Creating database 'score_ocean'..."
sudo -u postgres createdb score_ocean 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Database created"
else
    echo "  Database may already exist"
fi

# Initialize schema
echo "Initializing database schema..."
PGPASSWORD=$DB_PASSWORD psql -U postgres -h localhost -d score_ocean -f apps/backend/src/db/schema.sql
if [ $? -eq 0 ]; then
    echo "✓ Schema initialized"
else
    echo "✗ Failed to initialize schema"
fi

echo ""
echo "==================================="
echo "Setup complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Update apps/backend/.env with your database password"
echo "2. Run: npm run dev"
echo ""
