# Fix Database Connection Issues

## Problem Summary
- **PostgreSQL**: Password authentication failed
- **Redis**: Not installed/running

## Solution Steps

### 1. Fix PostgreSQL Password

PostgreSQL is running but the password doesn't match. You need to reset it:

```bash
# Option A: Reset password using peer authentication (no password needed)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Option B: If that doesn't work, edit pg_hba.conf temporarily
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Change the line:
#   local   all   postgres   peer
# To:
#   local   all   postgres   trust
# Then restart PostgreSQL:
sudo systemctl restart postgresql
# Now set the password:
psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
# Change pg_hba.conf back to 'peer' or 'md5' and restart again
```

### 2. Create Database and Schema

```bash
# Create the database
sudo -u postgres createdb score_ocean

# Initialize the schema
sudo -u postgres psql -d score_ocean -f apps/backend/src/db/schema.sql
```

### 3. Install and Start Redis

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 4. Update Environment Variables (if needed)

If you set a different password, update `apps/backend/.env`:

```env
DB_PASSWORD=your_actual_password
```

### 5. Test the Connection

```bash
# Test PostgreSQL
PGPASSWORD=postgres psql -U postgres -h localhost -d score_ocean -c "SELECT 1;"

# Test Redis
redis-cli ping

# Start the backend server
cd apps/backend
npm run dev
```

## Quick Fix Script

Run this script to automate most of the setup:

```bash
# Make it executable
chmod +x setup-services.sh

# Run it
./setup-services.sh
```

## Verification

After fixing, you should see:
- ✓ PostgreSQL connection successful
- ✓ Redis connected successfully
- ✓ Server running on port 3000

## Common Issues

### Issue: "peer authentication failed"
**Solution**: Use `sudo -u postgres` to run commands as the postgres user

### Issue: "database does not exist"
**Solution**: Run `sudo -u postgres createdb score_ocean`

### Issue: Redis connection refused
**Solution**: Install and start Redis with the commands above

### Issue: Permission denied
**Solution**: Make sure you're using `sudo` for system commands

## Need Help?

If you're still having issues:
1. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*-main.log`
2. Check Redis logs: `sudo journalctl -u redis-server -f`
3. Verify services are running: `systemctl status postgresql redis-server`
