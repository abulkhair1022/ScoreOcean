# Install Redis

Redis is required for caching and real-time features in Score Ocean.

## Installation Steps

```bash
# Update package list
sudo apt update

# Install Redis server and tools
sudo apt install redis-server redis-tools

# Start Redis service
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Quick Install (One Command)

```bash
sudo apt update && sudo apt install -y redis-server redis-tools && sudo systemctl start redis-server && sudo systemctl enable redis-server && redis-cli ping
```

## Verify Installation

After installation, test the connection:

```bash
# Test Redis CLI
redis-cli ping

# Check Redis status
sudo systemctl status redis-server
```

## Configuration (Optional)

Redis works out of the box with default settings. The Score Ocean backend is configured to connect to:
- Host: `localhost`
- Port: `6379`
- Password: (none)

These settings are in `apps/backend/.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## After Installation

Once Redis is installed and running, restart your backend server:

```bash
cd apps/backend
npm run dev
```

You should see:
```
✓ Redis connected successfully
✓ Server running on port 3000
```
