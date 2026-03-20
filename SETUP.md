# Score Ocean - Setup Guide

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **Redis** (v6 or higher)
4. **npm** or **yarn**

## Database Setup

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE score_ocean;
CREATE USER score_ocean_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE score_ocean TO score_ocean_user;

# Exit
\q
```

### 3. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Download from [Redis official website](https://redis.io/download) or use WSL

## Application Setup

### 1. Install Dependencies

```bash
# From project root
npm install
```

### 2. Configure Environment Variables

```bash
# Navigate to backend directory
cd apps/backend

# Copy example env file
cp .env.example .env

# Edit .env file with your database credentials
nano .env  # or use your preferred editor
```

Update the following in `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=score_ocean
DB_USER=score_ocean_user
DB_PASSWORD=your_password

# JWT Secrets (generate strong secrets for production)
JWT_ACCESS_SECRET=your-strong-access-secret-key
JWT_REFRESH_SECRET=your-strong-refresh-secret-key
```

### 3. Initialize Database Schema

```bash
# From apps/backend directory
npm run db:init
```

### 4. Start the Application

**Development Mode:**

```bash
# Terminal 1 - Start Backend
cd apps/backend
npm run dev

# Terminal 2 - Start Frontend
cd apps/frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Health Check: http://localhost:3000/health

## Verify Installation

### Check PostgreSQL
```bash
psql -U score_ocean_user -d score_ocean -c "SELECT version();"
```

### Check Redis
```bash
redis-cli ping
# Should return: PONG
```

### Check Backend
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

## Testing

```bash
# Run backend tests
cd apps/backend
npm test

# Run frontend tests
cd apps/frontend
npm test
```

## Troubleshooting

### PostgreSQL Connection Issues

1. Check if PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

2. Check PostgreSQL logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

3. Verify connection settings in `.env` match your PostgreSQL configuration

### Redis Connection Issues

1. Check if Redis is running:
```bash
redis-cli ping
```

2. Check Redis logs:
```bash
sudo tail -f /var/log/redis/redis-server.log
```

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Find process using the port
lsof -i :3000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

Or change the port in `.env` (backend) or `vite.config.ts` (frontend)

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use strong, randomly generated JWT secrets
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Use environment-specific database credentials
6. Enable database connection pooling
7. Set up monitoring and logging
8. Configure rate limiting
9. Set up backup strategies

## API Documentation

Once the server is running, you can test the API endpoints:

### Authentication Endpoints

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "SecurePass123!",
    "role": "PLAYER",
    "name": "John Doe",
    "age": 25,
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "SecurePass123!"
  }'
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Ensure all prerequisites are properly installed
4. Verify environment variables are correctly set
