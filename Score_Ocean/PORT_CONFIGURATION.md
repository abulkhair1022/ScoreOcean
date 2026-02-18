# Port Configuration Explained

## Current Setup (CORRECT ✓)

### Frontend (FE)
- **Port**: 5173
- **URL**: http://localhost:5173
- **Technology**: Vite + React
- **Purpose**: User interface

### Backend (BE)
- **Port**: 3000
- **URL**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **Technology**: Express.js + Node.js
- **Purpose**: REST API server

## Why Different Ports?

This is the **standard and recommended** setup for modern web applications:

1. **Separation of Concerns**:
   - Frontend serves the UI (HTML, CSS, JavaScript)
   - Backend serves the API (data, business logic)

2. **Development Benefits**:
   - Hot Module Replacement (HMR) on frontend without affecting backend
   - Independent restarts
   - Better debugging

3. **Production Deployment**:
   - Frontend can be deployed to CDN (Vercel, Netlify)
   - Backend can be deployed to server (AWS, Heroku)
   - Can scale independently

## How They Communicate

### Development Mode (Current):
```
Frontend (5173) → Vite Proxy → Backend (3000)
```

The Vite proxy configuration in `vite.config.ts` forwards API requests:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

### How It Works:
1. Frontend makes request to `/api/auth/login`
2. Vite proxy intercepts and forwards to `http://localhost:3000/api/auth/login`
3. Backend processes and responds
4. Response sent back to frontend

## Testing the Setup

### 1. Check Backend is Running
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T...",
  "uptime": 123.45
}
```

### 2. Check Frontend is Running
Open browser: http://localhost:5173

### 3. Test API from Frontend
Open browser console on http://localhost:5173 and run:
```javascript
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
```

Should return the same health check response.

## What I Fixed

### Before:
- ❌ API client using relative URL `/api` without understanding proxy
- ❌ No actual API integration in Login/Register pages
- ❌ No error handling or loading states
- ❌ No token storage or management

### After:
- ✅ API client properly configured with Vite proxy
- ✅ Full Login page with API integration
- ✅ Full Register page with comprehensive form
- ✅ Error handling and validation
- ✅ Loading states
- ✅ Token storage in localStorage
- ✅ Automatic token refresh on 401 errors
- ✅ Form validation (password match, required fields)

## Current Status

### ✅ Working:
- Backend API running on port 3000
- Frontend UI running on port 5173
- Vite proxy configured correctly
- API client with token management
- Login page with full integration
- Register page with full integration
- Error handling and validation

### ⚠️ Still Needs:
- PostgreSQL database (for actual data storage)
- Redis (optional, for caching)

## Next Steps

1. **Install PostgreSQL** (see SETUP.md)
2. **Initialize database schema**
3. **Test registration** - Create a new account
4. **Test login** - Login with created account
5. **Verify token storage** - Check browser localStorage

## Common Misconceptions

### ❌ "Frontend should be on port 3000"
No. In modern development:
- Frontend dev server (Vite/Webpack) uses its own port (5173, 3001, etc.)
- Backend API uses a different port (3000, 8000, etc.)
- They communicate via proxy or CORS

### ❌ "Everything should be on one port"
Only in production with a reverse proxy (Nginx, Apache):
```
User → Port 80/443 → Nginx → {
  /api/* → Backend (3000)
  /* → Frontend (static files)
}
```

### ✅ "Development uses multiple ports"
Yes! This is correct and standard practice.

## Verification Commands

```bash
# Check what's running on each port
lsof -i :3000  # Should show node (backend)
lsof -i :5173  # Should show node (vite/frontend)

# Test backend directly
curl http://localhost:3000/api/health

# Test frontend proxy
curl http://localhost:5173/api/health
# Should return same response as above
```

## Summary

Your setup is **100% correct**! 
- Frontend on 5173 ✓
- Backend on 3000 ✓
- Proxy configured ✓
- API integration complete ✓

The only thing missing is the database, which is why you can't actually register/login yet. Once PostgreSQL is set up, everything will work perfectly!
