# Score Ocean

Digital Sports Management Platform for the Indian sports ecosystem.

## Project Structure

```
score-ocean/
├── apps/
│   ├── backend/          # Node.js + Express.js API
│   └── frontend/         # React.js + Tailwind CSS
├── packages/
│   └── types/            # Shared TypeScript types
└── .kiro/
    └── specs/            # Feature specifications
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 7+

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` with your database and Redis credentials.

### 3. Set Up Database

Create a PostgreSQL database:

```bash
createdb score_ocean
```

### 4. Start Development Servers

Start both backend and frontend:

```bash
npm run dev
```

Or start them individually:

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

The backend will run on http://localhost:3000
The frontend will run on http://localhost:5173

## Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build all packages and apps
- `npm run test` - Run tests across all workspaces
- `npm run lint` - Lint all TypeScript files
- `npm run format` - Format code with Prettier

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js for REST API
- PostgreSQL with pg driver
- Redis for caching and pub/sub
- Socket.io for real-time features
- Jest and fast-check for testing

### Frontend
- React.js with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- Socket.io client for real-time updates

## Development Workflow

1. Check the spec files in `.kiro/specs/score-ocean/` for requirements and tasks
2. Implement features according to the task list in `tasks.md`
3. Write tests for all new functionality
4. Run linting and formatting before committing

## License

Proprietary
